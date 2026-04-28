import Stripe from "npm:stripe@16.2.0";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

/**
 * Stripe Webhook Handler
 *
 * Verifies the Stripe-Signature header, then on checkout.session.completed:
 *   1. Checks idempotency (stripe_session_id unique constraint)
 *   2. Inserts a confirmed booking row
 *   3. Returns 200 — Stripe will retry on non-2xx
 */

export async function handleStripeWebhook(req: Request): Promise<Response> {
  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!stripeSecret || !webhookSecret) {
    console.error("Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET");
    return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
      status: 500,
    });
  }

  const stripe = new Stripe(stripeSecret, {
    apiVersion: "2024-06-20",
    httpClient: Stripe.createFetchHttpClient(),
  });

  // Read raw body for signature verification
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return new Response(JSON.stringify({ error: "Missing stripe-signature" }), {
      status: 400,
    });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Signature verification failed";
    console.error("Webhook signature error:", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 400 });
  }

  // Only handle checkout fulfillment
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    await fulfillCheckout(session);
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
}

// ─────────────────────────────────────────────
// Fulfillment logic
// Uses service role key → bypasses RLS
// ─────────────────────────────────────────────
async function fulfillCheckout(session: Stripe.Checkout.Session): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const meta = session.metadata ?? {};
  const {
    student_id,
    tutor_id,
    subject,
    topic,
    date,
    start_time,
    hours,
    hourly_rate,
    total_amount,
  } = meta;

  if (!student_id || !tutor_id) {
    console.error(
      "Webhook fulfillment: missing student_id or tutor_id in metadata",
      meta,
    );
    return;
  }

  // Idempotency: skip if already fulfilled
  const { data: existing } = await supabase
    .from("bookings")
    .select("id")
    .eq("stripe_session_id", session.id)
    .maybeSingle();

  if (existing) {
    console.log("Webhook: booking already exists for session", session.id);
    return;
  }

  const totalCents = session.amount_total ?? 0;
  const totalAmount = totalCents / 100;

  const { error } = await supabase.from("bookings").insert({
    student_id,
    tutor_id,
    subject: subject ?? "Tutoring",
    topic: topic ?? null,
    date: date ?? new Date().toISOString().split("T")[0],
    start_time: start_time ?? "09:00",
    hours: parseInt(hours ?? "1", 10),
    hourly_rate: parseFloat(hourly_rate ?? "0"),
    total_amount: parseFloat(total_amount ?? String(totalAmount)),
    status: "confirmed",
    stripe_session_id: session.id,
  });

  if (error) {
    console.error("Webhook: booking insert failed:", error.message);
    // Do not throw — return 200 to Stripe so it doesn't retry endlessly
    // Log for manual reconciliation
    await supabase
      .from("fulfillment_errors")
      .insert({
        stripe_session_id: session.id,
        error_message: error.message,
        raw_metadata: meta,
      })
      .then(() => {});
  } else {
    console.log("Webhook: booking confirmed for session", session.id);
  }
}

