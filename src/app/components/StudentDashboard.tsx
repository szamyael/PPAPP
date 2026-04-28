import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { Navigation } from "./Navigation";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import {
  Calendar,
  BookOpen,
  Users,
  Star,
  TrendingUp,
  Clock,
  Search,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

interface DashboardStats {
  upcomingSessions: number;
  hoursThisMonth: number;
  progress: string;
}

interface UpcomingSession {
  id: string;
  subject: string;
  tutor_name: string;
  date: string;
  time: string;
}

interface RecentActivity {
  id: string;
  type: "message" | "material" | "rating";
  text: string;
  time: string;
}

export function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    upcomingSessions: 0,
    hoursThisMonth: 0,
    progress: "0%",
  });
  const [upcomingSessions, setUpcomingSessions] = useState<UpcomingSession[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== "student") {
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
          tutor:profiles!bookings_tutor_id_fkey (
            full_name
          )
        `)
        .eq("student_id", user.id)
        .gte("start_time", new Date().toISOString())
        .eq("status", "confirmed")
        .order("start_time", { ascending: true })
        .limit(3);

      if (sessionsError) throw sessionsError;

      setUpcomingSessions(
        (sessionsData || []).map((s: any) => ({
          id: s.id,
          subject: s.subject,
          tutor_name: s.tutor?.full_name || "Unknown Tutor",
          date: new Date(s.start_time).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          time: new Date(s.start_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
        }))
      );

      // 2. Fetch stats (Hours this month)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: monthData, error: monthError } = await supabase
        .from("bookings")
        .select("start_time, end_time")
        .eq("student_id", user.id)
        .eq("status", "completed")
        .gte("start_time", startOfMonth.toISOString());

      if (monthError) throw monthError;

      const totalHours = (monthData || []).reduce((sum, b) => {
        const start = new Date(b.start_time);
        const end = new Date(b.end_time);
        return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      }, 0);

      // 3. Fetch recent activities (Mocking logic based on real data)
      // For now, we'll fetch newsfeed posts as recent activity if no direct events
      const { data: newsData } = await supabase
        .from("newsfeed_posts")
        .select("id, author_name, content, created_at")
        .order("created_at", { ascending: false })
        .limit(3);

      setRecentActivities(
        (newsData || []).map((n: any) => ({
          id: n.id,
          type: "message",
          text: `${n.author_name} shared: "${n.content.slice(0, 30)}..."`,
          time: toRelativeTime(n.created_at),
        }))
      );

      setStats({
        upcomingSessions: (sessionsData || []).length,
        hoursThisMonth: Number(totalHours.toFixed(1)),
        progress: "+0%", // Progress calculation would need historical data
      });

    } catch (error) {
      console.error("Dashboard fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  function toRelativeTime(createdAt: string): string {
    const diff = Date.now() - new Date(createdAt).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  if (!user) return null;

  if (!user.approved) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-12">
          <Card>
            <CardHeader>
              <CardTitle>Account Pending Approval</CardTitle>
              <CardDescription>
                Your student account is currently being reviewed by an administrator. You'll
                receive an email once your account is approved.
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
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user.name}!</h1>
          <p className="text-gray-600 mt-1">Here's what's happening with your learning journey</p>
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
              label="Upcoming Sessions"
              value={stats.upcomingSessions.toString()}
            />
            <StatCard
              icon={<Clock className="h-8 w-8 text-purple-600" />}
              label="Hours This Month"
              value={stats.hoursThisMonth.toString()}
            />
            <StatCard
              icon={<TrendingUp className="h-8 w-8 text-green-600" />}
              label="Progress"
              value={stats.progress}
            />
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate("/find-tutors")}
          >
            <CardHeader>
              <Search className="h-10 w-10 text-blue-600 mb-2" />
              <CardTitle>Find a Tutor</CardTitle>
              <CardDescription>
                Browse qualified tutors and book your next session
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">Search Tutors</Button>
            </CardContent>
          </Card>

          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate("/study-groups")}
          >
            <CardHeader>
              <Users className="h-10 w-10 text-purple-600 mb-2" />
              <CardTitle>Study Groups</CardTitle>
              <CardDescription>Join or create study groups with your peers</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">Browse Groups</Button>
            </CardContent>
          </Card>

          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate("/library")}
          >
            <CardHeader>
              <BookOpen className="h-10 w-10 text-green-600 mb-2" />
              <CardTitle>Open Library</CardTitle>
              <CardDescription>
                Access learning materials shared by organizations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">Browse Library</Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity & Upcoming Sessions */}
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
                      subject={s.subject}
                      tutor={s.tutor_name}
                      date={s.date}
                      time={s.time}
                    />
                  ))}
                </div>
              )}
              <Button variant="outline" className="w-full mt-4" onClick={() => navigate("/sessions")}>
                View All Sessions
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest updates from your network</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-600" /></div>
              ) : recentActivities.length === 0 ? (
                <p className="text-center py-8 text-gray-500">No recent activity</p>
              ) : (
                <div className="space-y-4">
                  {recentActivities.map((a) => (
                    <ActivityItem
                      key={a.id}
                      icon={
                        a.type === "message" ? <MessageSquare className="h-5 w-5 text-blue-600" /> :
                        a.type === "material" ? <BookOpen className="h-5 w-5 text-green-600" /> :
                        <Star className="h-5 w-5 text-yellow-600" />
                      }
                      text={a.text}
                      time={a.time}
                    />
                  ))}
                </div>
              )}
              <Button variant="outline" className="w-full mt-4" onClick={() => navigate("/newsfeed")}>
                View Newsfeed
              </Button>
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
  subject,
  tutor,
  date,
  time,
}: {
  subject: string;
  tutor: string;
  date: string;
  time: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg">
      <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
      <div className="flex-1">
        <p className="font-semibold">{subject}</p>
        <p className="text-sm text-gray-600">with {tutor}</p>
        <p className="text-sm text-gray-500 mt-1">
          {date} at {time}
        </p>
      </div>
    </div>
  );
}

function ActivityItem({ icon, text, time }: { icon: ReactNode; text: string; time: string }) {
  return (
    <div className="flex items-start gap-3">
      {icon}
      <div className="flex-1">
        <p className="text-sm text-gray-900">{text}</p>
        <p className="text-xs text-gray-500 mt-0.5">{time}</p>
      </div>
    </div>
  );
}
