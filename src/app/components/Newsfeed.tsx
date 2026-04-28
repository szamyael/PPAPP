import { useEffect, useState } from "react";
import { Navigation } from "./Navigation";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Avatar } from "./ui/avatar";
import { Heart, MessageCircle, Share2, Send, Calendar, BookOpen, Flag, Bell, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { publicAnonKey, supabaseFunctionsBaseUrl } from "../../../utils/supabase/info";

// ── Mapped post type for UI ──────────────────────────────────────────
const POST_TYPES = {
  question:     { icon: <MessageCircle className="h-5 w-5 text-blue-600" />,   label: "Question" },
  announcement: { icon: <Bell          className="h-5 w-5 text-amber-600" />,  label: "Announcement" },
  event:        { icon: <Calendar      className="h-5 w-5 text-purple-600" />, label: "Event" },
  material:     { icon: <BookOpen      className="h-5 w-5 text-green-600" />,  label: "Material" },
};

interface DbFeedPost {
  id: string;
  author_name: string;
  author_role: string;
  author_avatar: string;
  post_type: string;
  content: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
}

interface FeedPost extends DbFeedPost {
  timeAgo: string;
}

function mapDbPost(row: DbFeedPost): FeedPost {
  const now = new Date();
  const created = new Date(row.created_at);
  const diffMs = now.getTime() - created.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  let timeAgo = "just now";
  if (diffMins < 60) timeAgo = `${diffMins}m ago`;
  else if (diffMins < 1440) timeAgo = `${Math.floor(diffMins / 60)}h ago`;
  else timeAgo = `${Math.floor(diffMins / 1440)}d ago`;

  return { ...row, timeAgo };
}

export function Newsfeed() {
  const { user, session } = useAuth();
  const [newPost,   setNewPost]   = useState("");
  const [posts,     setPosts]     = useState<FeedPost[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [reporting, setReporting] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("newsfeed_posts")
        .select("id, author_name, author_role, author_avatar, post_type, content, likes_count, comments_count, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPosts(data.map((row: any) => mapDbPost(row)));
    } catch (err) {
      console.error("Error fetching posts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const channel = supabase
      .channel("newsfeed-posts")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "newsfeed_posts" }, (payload) => {
        const mapped = mapDbPost(payload.new as DbFeedPost);
        setPosts((prev) => (prev.some((p) => p.id === mapped.id) ? prev : [mapped, ...prev]));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "newsfeed_posts" }, (payload) => {
        // Reflect removed/moderated posts
        const updated = mapDbPost(payload.new as DbFeedPost);
        setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      })
      .subscribe();

    return () => {
      isMounted = false;
      void supabase.removeChannel(channel);
    };
  }, []);

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
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-600" /></div>
        ) : posts.length === 0 ? (
          <Card className="py-12 text-center text-gray-500">No posts yet. Be the first to share something!</Card>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <Card key={post.id}>
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10 bg-blue-600 text-white flex items-center justify-center rounded-full">
                      {post.author_avatar || (post.author_name || "?").slice(0, 2).toUpperCase()}
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{post.author_name}</p>
                          <p className="text-sm text-gray-500">
                            {post.author_role.charAt(0).toUpperCase() + post.author_role.slice(1)} • {post.timeAgo}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {(POST_TYPES as any)[post.post_type]?.icon}
                        </div>
                      </div>
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
                    {user && user.id !== post.id && ( // Don't report yourself
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
