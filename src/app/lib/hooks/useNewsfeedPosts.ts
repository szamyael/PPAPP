import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "../supabaseClient";

export interface NewsfeedPost {
  id: string;
  author_id: string;
  author_name: string;
  author_role: string;
  author_avatar: string;
  post_type: string;
  content: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  timeAgo: string;
}

interface DbNewsfeedPost {
  id: string;
  author_id: string;
  author_name: string;
  author_role: string;
  author_avatar: string;
  post_type: string;
  content: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
}

function calculateTimeAgo(createdAt: string): string {
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now.getTime() - created.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  let timeAgo = "just now";
  if (diffMins < 60) timeAgo = `${diffMins}m ago`;
  else if (diffMins < 1440) timeAgo = `${Math.floor(diffMins / 60)}h ago`;
  else timeAgo = `${Math.floor(diffMins / 1440)}d ago`;

  return timeAgo;
}

function mapDbPost(row: DbNewsfeedPost): NewsfeedPost {
  return {
    ...row,
    timeAgo: calculateTimeAgo(row.created_at),
  };
}

async function fetchNewsfeedPosts(): Promise<NewsfeedPost[]> {
  const { data, error } = await supabase
    .from("newsfeed_posts")
    .select("id, author_id, author_name, author_role, author_avatar, post_type, content, likes_count, comments_count, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map((row: DbNewsfeedPost) => mapDbPost(row));
}

export function useNewsfeedPosts() {
  return useQuery({
    queryKey: ["newsfeedPosts"],
    queryFn: fetchNewsfeedPosts,
    staleTime: 1 * 60 * 1000, // 1 minute - newsfeed updates frequently
  });
}

export function useNewsfeedSubscription() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("newsfeed-posts")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "newsfeed_posts" }, (payload) => {
        const newPost = mapDbPost(payload.new as DbNewsfeedPost);
        queryClient.setQueryData(["newsfeedPosts"], (old: NewsfeedPost[] | undefined) => {
          if (!old) return [newPost];
          if (old.some((p) => p.id === newPost.id)) return old;
          return [newPost, ...old];
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "newsfeed_posts" }, (payload) => {
        const updatedPost = mapDbPost(payload.new as DbNewsfeedPost);
        queryClient.setQueryData(["newsfeedPosts"], (old: NewsfeedPost[] | undefined) => {
          if (!old) return old;
          return old.map((p) => (p.id === updatedPost.id ? updatedPost : p));
        });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

export function useUserConnections(userId: string | undefined) {
  return useQuery({
    queryKey: ["userConnections", userId],
    queryFn: async () => {
      if (!userId) return new Set<string>();
      
      const { data, error } = await supabase
        .from("user_connections")
        .select("following_id")
        .eq("follower_id", userId)
        .eq("status", "accepted");

      if (error) throw error;
      return new Set((data || []).map((c: { following_id: string }) => c.following_id));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!userId,
  });
}