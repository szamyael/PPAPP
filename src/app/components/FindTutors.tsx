import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Navigation } from "./Navigation";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { Star, Search, BookOpen, Calendar, DollarSign, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

interface Tutor {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string;
  subjects: string[];
  organization_name: string;
  rating: number;
  reviewCount: number;
  hourlyRate: number;
  experience: string;
  education: string;
  bio: string;
}

export function FindTutors() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTutors();
  }, []);

  const fetchTutors = async () => {
    setLoading(true);
    try {
      // Fetch tutors joined with profiles and organizations
      const { data, error } = await supabase
        .from("tutor_profiles")
        .select(`
          id,
          user_id,
          hourly_rate,
          subjects,
          experience,
          education,
          bio,
          profiles:user_id (
            full_name,
            avatar_url
          ),
          organizations:organization_id (
            name
          )
        `)
        .eq("approval_status", "approved");

      if (error) throw error;

      // Fetch ratings for these tutors
      const tutorUserIds = data.map(t => t.user_id);
      const { data: ratingsData, error: ratingsError } = await supabase
        .from("ratings")
        .select("rated_user, stars")
        .in("rated_user", tutorUserIds);

      if (ratingsError) throw ratingsError;

      const mappedTutors: Tutor[] = data.map((t: any) => {
        const tutorRatings = ratingsData.filter(r => r.rated_user === t.user_id);
        const avgRating = tutorRatings.length > 0 
          ? tutorRatings.reduce((sum, r) => sum + r.stars, 0) / tutorRatings.length 
          : 0;

        return {
          id: t.id,
          user_id: t.user_id,
          full_name: t.profiles?.full_name || "Unknown Tutor",
          avatar_url: t.profiles?.avatar_url || "",
          subjects: t.subjects || [],
          organization_name: t.organizations?.name || "Independent",
          rating: Number(avgRating.toFixed(1)),
          reviewCount: tutorRatings.length,
          hourlyRate: t.hourly_rate || 0,
          experience: t.experience || "",
          education: t.education || "",
          bio: t.bio || "",
        };
      });

      setTutors(mappedTutors);
    } catch (error) {
      console.error("Error fetching tutors:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTutors = tutors.filter((tutor) => {
    const matchesSearch =
      tutor.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tutor.subjects.some((s) => s.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSubject =
      subjectFilter === "all" || tutor.subjects.includes(subjectFilter);
    return matchesSearch && matchesSubject;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Find a Tutor</h1>
          <p className="text-gray-600 mt-1">
            Browse qualified tutors vetted by trusted organizations
          </p>
        </div>

        {/* Search and Filters */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or subject..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  <SelectItem value="Mathematics">Mathematics</SelectItem>
                  <SelectItem value="Physics">Physics</SelectItem>
                  <SelectItem value="Chemistry">Chemistry</SelectItem>
                  <SelectItem value="Biology">Biology</SelectItem>
                  <SelectItem value="Computer Science">Computer Science</SelectItem>
                  <SelectItem value="Statistics">Statistics</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tutors List */}
        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {filteredTutors.map((tutor) => (
              <Card
                key={tutor.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/book/${tutor.user_id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{tutor.full_name}</CardTitle>
                      <CardDescription className="mt-1">{tutor.organization_name}</CardDescription>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold">{tutor.rating || "New"}</span>
                      {tutor.reviewCount > 0 && (
                        <span className="text-sm text-gray-500">({tutor.reviewCount})</span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Subjects:</p>
                      <div className="flex flex-wrap gap-2">
                        {tutor.subjects.map((subject) => (
                          <Badge key={subject} variant="secondary">
                            {subject}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600 line-clamp-1">
                      <BookOpen className="h-4 w-4 shrink-0" />
                      {tutor.experience || tutor.education || "Qualified Tutor"}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-2 text-lg font-semibold text-green-600">
                        <DollarSign className="h-5 w-5" />
                        ₱{tutor.hourlyRate}/hour
                      </div>
                      <Button onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/book/${tutor.user_id}`);
                      }}>Book Session</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {filteredTutors.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600">No tutors found matching your criteria.</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setSearchTerm("");
                  setSubjectFilter("all");
                }}
              >
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
