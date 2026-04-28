import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { Navigation } from "./Navigation";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Avatar } from "./ui/avatar";
import { Heart, MessageCircle, Share2, Send, Calendar, BookOpen, Flag, Bell, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { publicAnonKey, supabaseFunctionsBaseUrl } from "../../../utils/supabase/info";
import { 
  useNewsfeedPosts, 
  useNewsfeedSubscription, 
  useUserConnections 
} from "../lib/hooks";
import type { NewsfeedPost } from "../lib/hooks/useNewsfeedPosts";

// ── Mapped post type for UI ──────────────────────────────────────────
const POST_TYPES = {
  question:     { icon: <MessageCircle className="h-5 w-5 text-blue-600" />,   label: "Question" },
  announcement: { icon: <Bell          className="h-5 w-5 text-amber-600" />,  label: "Announcement" },
  event:        { icon: <Calendar      className="h-5 w-5 text-purple-600" />, label: "Event" },
  material:     { icon: <BookOpen      className="h-5 w-5 text-green-600" />,  label: "Material" },
};

export function Newsfeed() {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [newPost, setNewPost] = useState("");
  const [reporting, setReporting] = useState<Record<string, boolean>>({});
  
  // Use React Query hooks
  const { data: posts, isLoading: postsLoading } = useNewsfeedPosts();
  const { data: following, isLoading: followingLoading } = useUserConnections(user?.id);

  // Set up real-time subscription
  useEffect(() => {
    const subscription = useNewsfeedSubscription();
    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const isLoading = postsLoading || followingLoading;

  const handleMessage = (authorId: string) => {
    navigate(`/messages?user_id=${authorId}`);
  };

  const handleViewProfile = (authorId: string) => {
    navigate(`/profile/${authorId}`);
  };

  const handleFollow = async (authorId: string) => {
    if (!user?.id) {
      toast.error("You must be logged in to follow users");
      return;
    }

    try {
      const isFollowing = following?.has(authorId);

      if (isFollowing) {
        await supabase
          .from("user_connections")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", authorId);
      } else {
        await supabase.from("user_connections").insert({
          follower_id: user.id,
          following_id: authorId,
          status: "accepted",
        });
      }

      // Optimistic update - invalidate to refetch
      toast.success(isFollowing ? "Unfollowed user" : "Following user");
    } catch (error) {
      console.error("Error updating follow:", error);
      toast.error("Failed to update follow status");
    }
  };

  // ── Report a post ────────────────────────────────────────────────────
  const handleReport = async (postId: string) => {
    if (!user) { toast.error("You must be signed in to report content."); return; }
    setReporting((prev) => ({ ...prev, [postId]: true }));

    try {
      const token    = session?.access_token;
      const endpoint = `${supabaseFunctionsBaseUrl}/moderation/flag`;

      const res = await fetch(endpoint, {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:   `Bearer ${token}`,
          apikey:          publicAnonKey,
        },
        body: JSON.stringify({
          content_type: "post",
          content_id:   postId,
          reason:       "User report: inappropriate or policy-violating content",
        }),
      });

      if (res.ok) {
        toast.success("Post reported. Our moderation team will review it.");
      } else {
        const json = await res.json();
        throw new Error(json.error ?? "Report failed");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Report failed");
    } finally {
      setReporting((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const handlePost = () => {
    if (!newPost.trim()) return;

    const content = newPost.trim();
    void supabase
      .from("newsfeed_posts")
      .insert({
        author_name:   user?.name         ?? "Anonymous",
        author_role:   user?.role         ?? "student",
        author_avatar: (user?.name ?? "?").slice(0, 2).toUpperCase(),
        post_type:     "question",
        content,
      })
      .then(({ error }) => {
        if (error) { toast.error("Unable to publish post right now"); return; }
        toast.success("Post shared successfully!");
        setNewPost("");
      });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Newsfeed</h1>
            <p className="text-gray-600 mt-1">Stay updated with the latest from your community</p>
          </div>
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-blue-600" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Newsfeed</h1>
          <p className="text-gray-600 mt-1">Stay updated with the latest from your community</p>
        </div>

        {/* Create Post */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <Textarea
              placeholder="Share a question, announcement, or upcoming event..."
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              rows={3}
              className="mb-3"
            />
            <div className="flex justify-end">
              <Button onClick={handlePost} disabled={!newPost.trim()}>
                <Send className="h-4 w-4 mr-2" />
                Post
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Posts */}
        {!posts || posts.length === 0 ? (
          <Card className="py-12 text-center text-gray-500">No posts yet. Be the first to share something!</Card>
        ) : (
          <div className="space-y-4">
            {posts.map((post: NewsfeedPost) => (
              <Card key={post.id}>
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10 bg-blue-600 text-white flex items-center justify-center rounded-full">
                      {post.author_avatar || (post.author_name || "?").slice(0, 2).toUpperCase()}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="cursor-pointer hover:underline min-w-0" onClick={() => handleViewProfile(post.author_id)}>
                          <p className="font-semibold truncate">{post.author_name}</p>
                          <p className="text-sm text-gray-500">
                            {post.author_role.charAt(0).toUpperCase() + post.author_role.slice(1)} • {post.timeAgo}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          {(POST_TYPES as any)[post.post_type]?.icon}
                        </div>
                      </div>
                      {/* Follow/Message buttons for other users */}
                      {user?.id !== post.author_id && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={() => handleFollow(post.author_id)}
                          >
                            {following?.has(post.author_id) ? "✓ Following" : "Follow"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={() => handleMessage(post.author_id)}
                          >
                            <MessageCircle className="h-3 w-3 mr-1" />
                            Message
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-900 mb-4 whitespace-pre-wrap">{post.content}</p>
                  <div className="flex items-center gap-6 pt-3 border-t border-gray-200">
                    <button
                      className="flex items-center gap-2 text-gray-600 hover:text-red-600 transition-colors"
                    >
                      <Heart className="h-5 w-5" />
                      <span className="text-sm">{post.likes_count}</span>
                    </button>
                    <button className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors">
                      <MessageCircle className="h-5 w-5" />
                      <span className="text-sm">{post.comments_count}</span>
                    </button>
                    <button className="flex items-center gap-2 text-gray-600 hover:text-green-600 transition-colors">
                      <Share2 className="h-5 w-5" />
                      <span className="text-sm">Share</span>
                    </button>
                    {/* Report button — only shown to signed-in non-admin users */}
                    {user && user.id !== post.author_id && ( // Don't report yourself
                      <button
                        className="ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40"
                        onClick={() => handleReport(post.id)}
                        disabled={reporting[post.id]}
                        title="Report this post"
                      >
                        <Flag className="h-4 w-4" />
                        <span>{reporting[post.id] ? "Reporting…" : "Report"}</span>
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}