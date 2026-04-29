import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { Navigation } from "./Navigation";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Avatar } from "./ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ArrowLeft, Heart, MessageCircle, Mail, Users, BookOpen, Star, Loader2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  full_name: string;
  avatar_url?: string;
  role: "student" | "tutor" | "admin" | "organization";
  organizations?: { name: string } | null;
  created_at?: string;
  tutor_profiles?: {
    hourly_rate?: number;
    subjects?: string[];
    bio?: string;
    experience?: string;
    education?: string;
  }[];
  ratings?: { 
    id: string;
    stars: number; 
    comment: string; 
    student?: { full_name: string } 
  }[];
}

export function ProfileView() {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  useEffect(() => {
    fetchProfile();
    if (currentUser?.id !== userId) {
      fetchFollowStatus();
      fetchFollowCounts();
    }
  }, [userId, currentUser]);

  const fetchProfile = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          `
          id,
          full_name,
          avatar_url,
          role,
          created_at,
          organizations (
            name
          ),
          tutor_profiles (
            hourly_rate,
            subjects,
            bio,
            experience,
            education
          ),
          ratings!ratings_rated_user_profile_fkey (
            id,
            stars,
            comment,
            student:profiles!ratings_rated_by_profile_fkey (
              full_name
            )
          )
        `
        )
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast.error("User not found");
        navigate("/find-people");
        return;
      }

      // Format data for the UI
      const formattedProfile: UserProfile = {
        ...data,
        ratings: (data.ratings as any[]) || []
      };
      setProfile(formattedProfile);
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowStatus = async () => {
    if (!currentUser?.id || !userId) return;
    try {
      const { data, error } = await supabase
        .from("user_connections")
        .select("status")
        .eq("follower_id", currentUser.id)
        .eq("following_id", userId)
        .maybeSingle();

      if (error) throw error;
      setIsFollowing(data?.status === "accepted");
    } catch (error) {
      console.error("Error fetching follow status:", error);
    }
  };

  const fetchFollowCounts = async () => {
    if (!userId) return;
    try {
      // Followers count
      const { count: followers, error: followersError } = await supabase
        .from("user_connections")
        .select("*", { count: "exact", head: true })
        .eq("following_id", userId)
        .eq("status", "accepted");

      // Following count
      const { count: following, error: followingError } = await supabase
        .from("user_connections")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", userId)
        .eq("status", "accepted");

      if (followersError) throw followersError;
      if (followingError) throw followingError;

      setFollowerCount(followers || 0);
      setFollowingCount(following || 0);
    } catch (error) {
      console.error("Error fetching follow counts:", error);
    }
  };

  const handleFollow = async () => {
    if (!currentUser?.id || !userId) return;

    setIsFollowLoading(true);
    try {
      if (isFollowing) {
        // Unfollow
        await supabase
          .from("user_connections")
          .delete()
          .eq("follower_id", currentUser.id)
          .eq("following_id", userId);

        setIsFollowing(false);
        setFollowerCount((prev) => Math.max(0, prev - 1));
        toast.success("Unfollowed");
      } else {
        // Follow
        await supabase.from("user_connections").insert({
          follower_id: currentUser.id,
          following_id: userId,
          status: "accepted",
        });

        setIsFollowing(true);
        setFollowerCount((prev) => prev + 1);
        toast.success("Following!");
      }
    } catch (error) {
      console.error("Error updating follow:", error);
      toast.error("Failed to update follow status");
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleMessage = () => {
    navigate(`/messages?user_id=${userId}`);
  };

  const isOwnProfile = currentUser?.id === userId;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex justify-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card className="py-12 text-center">
            <p className="text-gray-500">User profile not found</p>
          </Card>
        </div>
      </div>
    );
  }

  const avgRating =
    profile.ratings && profile.ratings.length > 0
      ? profile.ratings.reduce((sum, r) => sum + r.stars, 0) / profile.ratings.length
      : 0;

  const initials = profile.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Profile Header Card */}
        <Card className="mb-8">
          <CardContent className="pt-8">
            <div className="flex items-start gap-6 mb-6">
              {/* Avatar */}
              <Avatar className="h-24 w-24 bg-blue-600 text-white flex items-center justify-center rounded-full text-2xl font-semibold flex-shrink-0">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.full_name} className="rounded-full h-full w-full object-cover" />
                ) : (
                  initials
                )}
              </Avatar>

              {/* Profile Info */}
              <div className="flex-1 min-w-0">
                <h1 className="text-3xl font-bold mb-2">{profile.full_name}</h1>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <Badge variant="outline" className="text-sm">
                    {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
                  </Badge>
                  {profile.organizations?.name && (
                    <Badge variant="secondary" className="text-sm">
                      {profile.organizations.name}
                    </Badge>
                  )}
                </div>

                {(profile.bio || profile.tutor_profiles?.[0]?.bio) && (
                  <p className="text-gray-600 mb-4 max-w-2xl">
                    {profile.bio || profile.tutor_profiles?.[0]?.bio}
                  </p>
                )}

                {/* Stats */}
                <div className="flex gap-6 mb-6 text-sm">
                  <div>
                    <p className="text-gray-600">Followers</p>
                    <p className="text-xl font-bold">{followerCount}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Following</p>
                    <p className="text-xl font-bold">{followingCount}</p>
                  </div>
                  {profile.role === "tutor" && avgRating > 0 && (
                    <div>
                      <p className="text-gray-600">Rating</p>
                      <div className="flex items-center gap-1">
                        <span className="text-xl font-bold">{avgRating.toFixed(1)}</span>
                        <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                {!isOwnProfile && (
                  <div className="flex gap-3">
                    <Button onClick={handleFollow} disabled={isFollowLoading} variant={isFollowing ? "default" : "outline"}>
                      <Heart className={`h-4 w-4 mr-2 ${isFollowing ? "fill-current" : ""}`} />
                      {isFollowing ? "Following" : "Follow"}
                    </Button>
                    <Button onClick={handleMessage} variant="outline">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Message
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tutor-Specific Info */}
        {profile.role === "tutor" && profile.tutor_profiles?.[0] && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Tutoring Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile.tutor_profiles[0].subjects && (
                <div>
                  <p className="font-semibold mb-2">Subjects</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.tutor_profiles[0].subjects.map((subject) => (
                      <Badge key={subject} variant="secondary">
                        {subject}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {profile.tutor_profiles[0].hourly_rate && (
                <div>
                  <p className="font-semibold">Hourly Rate</p>
                  <p className="text-lg">₱{profile.tutor_profiles[0].hourly_rate}/hour</p>
                </div>
              )}

              {profile.tutor_profiles[0].experience && (
                <div>
                  <p className="font-semibold">Experience</p>
                  <p className="text-gray-600">{profile.tutor_profiles[0].experience}</p>
                </div>
              )}

              {profile.tutor_profiles[0].education && (
                <div>
                  <p className="font-semibold">Education</p>
                  <p className="text-gray-600">{profile.tutor_profiles[0].education}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Reviews Section */}
        {profile.role === "tutor" && profile.ratings && profile.ratings.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Reviews ({profile.ratings.length})</CardTitle>
              <CardDescription>What students are saying</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {profile.ratings.map((review) => (
                  <div key={review.id} className="border-b border-gray-200 pb-4 last:border-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold">{review.student?.full_name || "Anonymous"}</p>
                        <div className="flex text-yellow-400 mt-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span key={i} className={i < review.stars ? "text-yellow-400" : "text-gray-300"}>
                              ★
                            </span>
                          ))}
                        </div>
                      </div>
                      <span className="text-lg font-bold">{review.stars}.0</span>
                    </div>
                    {review.comment && <p className="text-gray-600 text-sm">{review.comment}</p>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
