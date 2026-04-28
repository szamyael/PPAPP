import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { Navigation } from "./Navigation";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Calendar, DollarSign, Users, Star, TrendingUp, BookOpen, PenTool, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

interface DashboardStats {
  sessionsThisMonth: number;
  activeStudents: number;
  averageRating: number;
  earnings: number;
}

interface UpcomingSession {
  id: string;
  student_name: string;
  subject: string;
  date: string;
  time: string;
  duration: string;
}

interface Review {
  id: string;
  student_name: string;
  rating: number;
  comment: string;
  improvement: string | null;
}

export function TutorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    sessionsThisMonth: 0,
    activeStudents: 0,
    averageRating: 0,
    earnings: 0,
  });
  const [upcomingSessions, setUpcomingSessions] = useState<UpcomingSession[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== "tutor") {
      navigate("/login");
      return;
    }
    fetchDashboardData();
  }, [user, navigate]);

  const fetchDashboardData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Fetch upcoming sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from("bookings")
        .select(`
          id,
          subject,
          start_time,
          hours,
          student:profiles!bookings_student_profile_fkey (
            full_name
          )
        `)
        .eq("tutor_id", user.id)
        .gte("start_time", new Date().toISOString())
        .eq("status", "confirmed")
        .order("start_time", { ascending: true })
        .limit(3);

      if (sessionsError) throw sessionsError;

      setUpcomingSessions(
        (sessionsData || []).map((s: any) => {
          const start = new Date(s.start_time);
          const durationHours = s.hours || 1;

          return {
            id: s.id,
            subject: s.subject,
            student_name: s.student?.full_name || "Unknown Student",
            date: start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            time: start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
            duration: `${durationHours} hour${durationHours !== 1 ? "s" : ""}`,
          };
        })
      );

      // 2. Stats (Earnings and Sessions This Month)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: monthData, error: monthError } = await supabase
        .from("bookings")
        .select("total_amount, student_id")
        .eq("tutor_id", user.id)
        .eq("status", "completed")
        .gte("start_time", startOfMonth.toISOString());

      if (monthError) throw monthError;

      const earnings = (monthData || []).reduce((sum, b) => sum + b.total_amount, 0);
      const uniqueStudents = new Set((monthData || []).map(b => b.student_id)).size;

      // 3. Average Rating and Reviews
      const { data: ratingData, error: ratingError } = await supabase
        .from("ratings")
        .select(`
          id,
          stars,
          comment,
          proof_url,
          student:profiles!ratings_rated_by_profile_fkey (
            full_name
          )
        `)
        .eq("rated_user", user.id)
        .order("created_at", { ascending: false });

      if (ratingError) throw ratingError;

      const avgRating = ratingData.length > 0
        ? ratingData.reduce((sum, r) => sum + r.stars, 0) / ratingData.length
        : 0;

      setReviews(
        (ratingData || []).slice(0, 3).map((r: any) => ({
          id: r.id,
          student_name: r.student?.full_name || "Anonymous",
          rating: r.stars,
          comment: r.comment || "No comment",
          improvement: r.proof_url ? "Progress proof uploaded" : null,
        }))
      );

      setStats({
        sessionsThisMonth: (monthData || []).length,
        activeStudents: uniqueStudents,
        averageRating: Number(avgRating.toFixed(1)),
        earnings: Number((earnings * 0.95).toFixed(2)), // 5% platform commission
      });

    } catch (error) {
      console.error("Dashboard fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  if (!user.approved) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-12">
          <Card>
            <CardHeader>
              <CardTitle>Application Pending</CardTitle>
              <CardDescription>
                Your tutor application is being reviewed by {user.organizationName}. You'll be
                notified once approved.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome, {user.name}!</h1>
          <p className="text-gray-600 mt-1">
            {user.organizationName} • Manage your tutoring sessions and materials
          </p>
        </div>

        {/* Quick Stats */}
        {loading ? (
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="pt-6 h-24 bg-gray-100 rounded-lg"></CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <StatCard
              icon={<Calendar className="h-8 w-8 text-blue-600" />}
              label="Sessions This Month"
              value={stats.sessionsThisMonth.toString()}
            />
            <StatCard
              icon={<Users className="h-8 w-8 text-purple-600" />}
              label="Active Students"
              value={stats.activeStudents.toString()}
            />
            <StatCard
              icon={<Star className="h-8 w-8 text-yellow-600" />}
              label="Average Rating"
              value={stats.averageRating > 0 ? stats.averageRating.toString() : "N/A"}
            />
            <StatCard
              icon={<DollarSign className="h-8 w-8 text-green-600" />}
              label="Earnings (95%)"
              value={`₱${stats.earnings}`}
            />
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate("/materials")}
          >
            <CardHeader>
              <BookOpen className="h-10 w-10 text-blue-600 mb-2" />
              <CardTitle>Learning Materials</CardTitle>
              <CardDescription>Upload and manage your teaching materials</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">Manage Materials</Button>
            </CardContent>
          </Card>

          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate("/quiz-maker")}
          >
            <CardHeader>
              <PenTool className="h-10 w-10 text-purple-600 mb-2" />
              <CardTitle>Quiz Maker</CardTitle>
              <CardDescription>Create quizzes and tests for your students</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">Create Quiz</Button>
            </CardContent>
          </Card>

          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate("/sessions")}
          >
            <CardHeader>
              <Calendar className="h-10 w-10 text-green-600 mb-2" />
              <CardTitle>My Sessions</CardTitle>
              <CardDescription>View and manage your tutoring sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">View Sessions</Button>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Sessions & Recent Reviews */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Sessions</CardTitle>
              <CardDescription>Your scheduled tutoring sessions</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-600" /></div>
              ) : upcomingSessions.length === 0 ? (
                <p className="text-center py-8 text-gray-500">No upcoming sessions</p>
              ) : (
                <div className="space-y-4">
                  {upcomingSessions.map((s) => (
                    <SessionItem
                      key={s.id}
                      student={s.student_name}
                      subject={s.subject}
                      date={s.date}
                      time={s.time}
                      duration={s.duration}
                    />
                  ))}
                </div>
              )}
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => navigate("/sessions")}
              >
                View All Sessions
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Reviews</CardTitle>
              <CardDescription>What students are saying about you</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-600" /></div>
              ) : reviews.length === 0 ? (
                <p className="text-center py-8 text-gray-500">No reviews yet</p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((r) => (
                    <ReviewItem
                      key={r.id}
                      student={r.student_name}
                      rating={r.rating}
                      comment={r.comment}
                      improvement={r.improvement}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

function SessionItem({
  student,
  subject,
  date,
  time,
  duration,
}: {
  student: string;
  subject: string;
  date: string;
  time: string;
  duration: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg">
      <Users className="h-5 w-5 text-blue-600 mt-0.5" />
      <div className="flex-1">
        <p className="font-semibold">{student}</p>
        <p className="text-sm text-gray-600">{subject}</p>
        <p className="text-sm text-gray-500 mt-1">
          {date} at {time} • {duration}
        </p>
      </div>
    </div>
  );
}

function ReviewItem({
  student,
  rating,
  comment,
  improvement,
}: {
  student: string;
  rating: number;
  comment: string;
  improvement: string | null;
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="font-semibold">{student}</p>
        <div className="flex">
          {Array.from({ length: rating }).map((_, i) => (
            <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          ))}
        </div>
      </div>
      <p className="text-sm text-gray-600 mb-2">{comment}</p>
      {improvement && (
        <div className="bg-green-50 border border-green-200 rounded px-2 py-1 inline-block">
          <p className="text-xs text-green-700 font-medium">
            <TrendingUp className="h-3 w-3 inline mr-1" />
            {improvement}
          </p>
        </div>
      )}
    </div>
  );
}
