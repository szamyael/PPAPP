import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Navigation } from "./Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Calendar, Clock, Star, MessageCircle, Video, Loader2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";

interface Session {
  id: string;
  other_party_name: string;
  subject: string;
  topic: string;
  date: string;
  time: string;
  duration: string;
  status: string;
  rated: boolean;
}

export function MySessions() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [user]);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const isTutor = user?.role === "tutor";
      const fieldToMatch = isTutor ? "tutor_id" : "student_id";
      const joinField = isTutor ? "student_id" : "tutor_id";

      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id,
          subject,
          topic,
          start_time,
          end_time,
          status,
          other_party:profiles!bookings_${joinField}_fkey (
            full_name
          ),
          ratings (
            id
          )
        `)
        .eq(fieldToMatch, user?.id)
        .order("start_time", { ascending: false });

      if (error) throw error;

      const mapped: Session[] = (data || []).map((s: any) => {
        const start = new Date(s.start_time);
        const end = new Date(s.end_time);
        const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

        return {
          id: s.id,
          other_party_name: s.other_party?.full_name || "Unknown",
          subject: s.subject,
          topic: s.topic,
          date: start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          time: start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
          duration: `${durationHours} hour${durationHours !== 1 ? "s" : ""}`,
          status: s.status,
          rated: (s.ratings || []).length > 0,
        };
      });

      setSessions(mapped);
    } catch (error) {
      console.error("Error fetching sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  const upcomingSessions = sessions.filter(s => s.status === "confirmed" || s.status === "pending");
  const pastSessions = sessions.filter(s => s.status === "completed");

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Sessions</h1>
          <p className="text-gray-600 mt-1">Manage your tutoring sessions</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
          </div>
        ) : (
          <Tabs defaultValue="upcoming">
            <TabsList>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="past">Past</TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="mt-6">
              {upcomingSessions.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-gray-500">
                    No upcoming sessions found.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  {upcomingSessions.map((session) => (
                    <Card key={session.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle>{session.subject}</CardTitle>
                            <CardDescription className="mt-1">
                              {user?.role === "tutor" ? "Student" : "Tutor"}: {session.other_party_name}
                            </CardDescription>
                          </div>
                          <Badge variant={session.status === "confirmed" ? "default" : "secondary"}>
                            {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-gray-600" />
                          {session.date}
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-gray-600" />
                          {session.time} • {session.duration}
                        </div>
                        <div className="flex flex-wrap gap-2 pt-3">
                          <Button variant="outline" className="flex-1 min-w-[140px]" onClick={() => navigate("/messages")}>
                            <MessageCircle className="h-4 w-4 mr-2" />
                            Message
                          </Button>
                          <Button
                            className="flex-1 min-w-[140px]"
                            onClick={() => navigate(`/sessions/${session.id}/call`)}
                            disabled={session.status !== "confirmed"}
                          >
                            <Video className="h-4 w-4 mr-2" />
                            Join Video Call
                          </Button>
                          {session.status === "pending" && (
                            <Button variant="outline" className="flex-1 min-w-[140px]">Cancel</Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="past" className="mt-6">
              {pastSessions.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-gray-500">
                    No past sessions found.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  {pastSessions.map((session) => (
                    <Card key={session.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle>{session.subject}</CardTitle>
                            <CardDescription className="mt-1">
                              {user?.role === "tutor" ? "Student" : "Tutor"}: {session.other_party_name}
                            </CardDescription>
                          </div>
                          <Badge variant="secondary">Completed</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-gray-600" />
                          {session.date}
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-gray-600" />
                          {session.duration}
                        </div>
                        {!session.rated && user?.role === "student" && (
                          <Button className="w-full mt-3" onClick={() => navigate(`/rate/${session.id}`)}>
                            <Star className="h-4 w-4 mr-2" />
                            Rate Session
                          </Button>
                        )}
                        {session.rated && (
                          <p className="text-sm text-green-600 text-center pt-2">✓ Rated</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
