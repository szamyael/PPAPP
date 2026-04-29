import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Navigation } from "./Navigation";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { UserCard } from "./ui/UserCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Search, Loader2, Users } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { toast } from "sonner";

interface User {
  id: string;
  full_name: string;
  avatar_url?: string;
  role: "student" | "tutor" | "admin" | "organization";
  organization_name?: string;
  bio?: string;
  tutor_profiles?: {
    hourly_rate?: number;
    subjects?: string[];
    bio?: string;
  }[];
  ratings_avg?: number;
  ratings_count?: number;
  connections?: { status: string; follower_id: string }[];
}

export function FindPeople() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name");
  const [following, setFollowing] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchUsers();
    fetchFollowing();
  }, [user]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          avatar_url,
          role,
          organization_name,
          bio,
          tutor_profiles:tutor_profiles!tutor_profiles_user_id_fkey (
            hourly_rate,
            subjects,
            bio
          ),
          ratings_received:ratings!ratings_rated_user_profile_fkey (
            stars
          )
        `)
        .neq("id", user?.id); // Exclude self

      if (error) throw error;

      const processedUsers = (data || []).map((u: any) => ({
        id: u.id,
        full_name: u.full_name,
        avatar_url: u.avatar_url,
        role: u.role,
        organization_name: u.organization_name,
        bio: u.bio,
        tutor_profiles: u.tutor_profiles,
        ratings_avg:
          u.ratings_received?.length > 0
            ? u.ratings_received.reduce((sum: number, r: any) => sum + r.stars, 0) / u.ratings_received.length
            : 0,
        ratings_count: u.ratings_received?.length || 0,
      }));

      setUsers(processedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowing = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("user_connections")
        .select("following_id")
        .eq("follower_id", user.id)
        .eq("status", "accepted");

      if (error) throw error;

      const followingSet = new Set((data || []).map((c: any) => c.following_id));
      setFollowing(followingSet);
    } catch (error) {
      console.error("Error fetching following:", error);
    }
  };

  const handleFollow = async (userId: string) => {
    if (!user) {
      toast.error("You must be logged in to follow users");
      return;
    }

    try {
      const isFollowing = following.has(userId);

      if (isFollowing) {
        // Unfollow
        await supabase
          .from("user_connections")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", userId);

        setFollowing((prev) => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
        toast.success("Unfollowed");
      } else {
        // Follow
        await supabase.from("user_connections").insert({
          follower_id: user.id,
          following_id: userId,
          status: "accepted",
        });

        setFollowing((prev) => new Set(prev).add(userId));
        toast.success("Following!");
      }
    } catch (error) {
      console.error("Error updating follow:", error);
      toast.error("Failed to update follow status");
    }
  };

  const handleMessage = (userId: string) => {
    navigate(`/messages?user_id=${userId}`);
  };

  const handleViewProfile = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  // Filter and sort users
  const filteredUsers = useMemo(() => {
    let result = users;

    // Role filter
    if (roleFilter !== "all") {
      result = result.filter((u) => u.role === roleFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (u) =>
          u.full_name.toLowerCase().includes(query) ||
          u.organization_name?.toLowerCase().includes(query) ||
          u.tutor_profiles?.[0]?.subjects?.some((s: string) => s.toLowerCase().includes(query))
      );
    }

    // Sort
    result = result.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.full_name.localeCompare(b.full_name);
        case "rating":
          return (b.ratings_avg || 0) - (a.ratings_avg || 0);
        case "recent":
          return 0; // Would need created_at from profiles
        default:
          return 0;
      }
    });

    return result;
  }, [users, roleFilter, searchQuery, sortBy]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Find People</h1>
          <p className="text-gray-600 mt-1">Search and connect with other users</p>
        </div>

        {/* Search and Filters */}
        <Card className="mb-8">
          <CardContent className="pt-6 space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by name, organization, or subject..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10"
                  icon={<Search className="h-4 w-4" />}
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="student">Students</SelectItem>
                  <SelectItem value="tutor">Tutors</SelectItem>
                  <SelectItem value="organization">Organizations</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="rating">Rating</SelectItem>
                  <SelectItem value="recent">Recently Joined</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-gray-500">
              Showing {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        {/* Users Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No users found matching your search</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUsers.map((u) => (
              <UserCard
                key={u.id}
                id={u.id}
                name={u.full_name}
                avatarUrl={u.avatar_url}
                role={u.role}
                bio={u.bio || u.tutor_profiles?.[0]?.bio}
                organization={u.organization_name}
                subjects={u.tutor_profiles?.[0]?.subjects}
                hourlyRate={u.tutor_profiles?.[0]?.hourly_rate}
                rating={u.ratings_avg}
                reviewCount={u.ratings_count}
                isFollowing={following.has(u.id)}
                onFollow={handleFollow}
                onMessage={handleMessage}
                onViewProfile={handleViewProfile}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
