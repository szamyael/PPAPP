import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export interface FeedPost {
  id: string;
  author: string;
  role: string;
  avatar: string;
  type: string;
  content: string;
  likes: number;
  comments: number;
  time: string;
}

export interface DbFeedPost {
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

export function mapDbPost(row: DbFeedPost): FeedPost {
  return {
    id: row.id,
    author: row.author_name || "Anonymous",
    role: row.author_role || "student",
    avatar: row.author_avatar || (row.author_name || "?").slice(0, 2).toUpperCase(),
    type: row.post_type || "question",
    content: row.content || "",
    likes: row.likes_count || 0,
    comments: row.comments_count || 0,
    time: toRelativeTime(row.created_at),
  };
}

function toRelativeTime(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function useNewsfeedPosts() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("newsfeed_posts")
        .select("id, author_name, author_role, author_avatar, post_type, content, likes_count, comments_count, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) {
        setPosts(data.map((row: any) => mapDbPost(row as DbFeedPost)));
      }
    } catch (err) {
      console.error("Error fetching posts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();

    const channel = supabase
      .channel("newsfeed-posts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "newsfeed_posts" },
        (payload) => {
          const mapped = mapDbPost(payload.new as DbFeedPost);
          setPosts((prev) => (prev.some((p) => p.id === mapped.id) ? prev : [mapped, ...prev]));
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "newsfeed_posts" },
        (payload) => {
          const updated = mapDbPost(payload.new as DbFeedPost);
          setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const handleLike = async (postId: string) => {
    try {
      const post = posts.find((p) => p.id === postId);
      if (!post) return;

      const { error } = await supabase
        .from("newsfeed_posts")
        .update({ likes_count: post.likes + 1 })
        .eq("id", postId);

      if (error) throw error;
      
      // Update local state is handled by real-time subscription (UPDATE event)
    } catch (err) {
      console.error("Error liking post:", err);
    }
  };

  return {
    posts,
    loading,
    refresh: fetchPosts,
    handleLike,
  };
}
