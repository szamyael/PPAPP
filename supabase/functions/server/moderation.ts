import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

/**
 * Moderation API
 *
 * POST /moderation/flag   — authenticated users report content
 * POST /moderation/review — admin-only: approve / remove / warn
 */

interface FlagInput {
  content_type: "post" | "message" | "material" | "chat_message";
  content_id: string;
  reason: string;
}

interface ReviewInput {
  flag_id: string;
  action: "approved" | "removed" | "warned";
  notes?: string;
}

// ─────────────────────────────────────────────
// Helper: get caller's role from JWT
// ─────────────────────────────────────────────
async function getCallerRole(authHeader: string | null): Promise<string | null> {
  if (!authHeader) return null;
  const token = authHeader.replace("Bearer ", "");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );

  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return null;

  // Use service role to read profile
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return profile?.role ?? null;
}

// ─────────────────────────────────────────────
// Flag content (any authenticated user)
// ─────────────────────────────────────────────
export async function flagContent(req: Request): Promise<Response> {
  const authHeader = req.headers.get("Authorization");
  const callerRole = await getCallerRole(authHeader);

  if (!callerRole) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  let body: FlagInput;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const { content_type, content_id, reason } = body;
  if (!content_type || !content_id || !reason) {
    return new Response(
      JSON.stringify({ error: "content_type, content_id and reason are required" }),
      { status: 400 },
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { error } = await supabase.from("content_flags").insert({
    content_type,
    content_id,
    reason,
    auto_flagged: false,
    status: "open",
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
}

// ─────────────────────────────────────────────
// Review / moderate content (admin only)
// ─────────────────────────────────────────────
export async function reviewContent(req: Request): Promise<Response> {
  const authHeader = req.headers.get("Authorization");
  const callerRole = await getCallerRole(authHeader);

  if (callerRole !== "admin") {
    return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403 });
  }

  let body: ReviewInput;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const { flag_id, action, notes } = body;
  if (!flag_id || !action) {
    return new Response(
      JSON.stringify({ error: "flag_id and action are required" }),
      { status: 400 },
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Fetch the flag
  const { data: flag, error: flagError } = await supabase
    .from("content_flags")
    .select("*")
    .eq("id", flag_id)
    .maybeSingle();

  if (flagError || !flag) {
    return new Response(JSON.stringify({ error: "Flag not found" }), { status: 404 });
  }

  // If removing a post, blank its content
  if (action === "removed" && flag.content_type === "post") {
    await supabase
      .from("newsfeed_posts")
      .update({ content: "[This post was removed by a moderator]" })
      .eq("id", flag.content_id);
  }

  // Update flag status
  await supabase
    .from("content_flags")
    .update({ status: "reviewed" })
    .eq("id", flag_id);

  // Log the action
  await supabase.from("moderation_log").insert({
    content_type: flag.content_type,
    content_id: flag.content_id,
    action,
    flag_id,
    notes: notes ?? null,
  });

  return new Response(JSON.stringify({ success: true, action }), { status: 200 });
}

