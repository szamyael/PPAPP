import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createCheckoutSession } from "./stripe.ts";
import { createBotReply, fileSupportTicket } from "./support.ts";
import { handleStripeWebhook } from "./webhook.ts";
import { flagContent, reviewContent } from "./moderation.ts";

const app = new Hono();

// Enable logger
app.use("*", logger(console.log));

// CORS — restrict in production by replacing '*' with your domain
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "apikey", "stripe-signature"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// ─────────────────────────────────────────────
// Health check
// ─────────────────────────────────────────────
app.get("/make-server-45108270/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─────────────────────────────────────────────
// Stripe: create checkout session
// ─────────────────────────────────────────────
app.post("/make-server-45108270/stripe/create-checkout-session", async (c) => {
  try {
    const body = await c.req.json();
    const result = await createCheckoutSession({
      amountCents: body?.amountCents,
      currency: body?.currency,
      description: body?.description,
      metadata: body?.metadata,
      origin: c.req.header("origin") ?? undefined,
    });
    return c.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 400);
  }
});

// ─────────────────────────────────────────────
// Stripe: webhook (called by Stripe servers)
// NOTE: Must NOT strip body — pass raw Request through
// ─────────────────────────────────────────────
app.post("/make-server-45108270/stripe/webhook", async (c) => {
  return handleStripeWebhook(c.req.raw);
});

// ─────────────────────────────────────────────
// Moderation
// ─────────────────────────────────────────────
app.post("/make-server-45108270/moderation/flag", async (c) => {
  return flagContent(c.req.raw);
});

app.post("/make-server-45108270/moderation/review", async (c) => {
  return reviewContent(c.req.raw);
});

// ─────────────────────────────────────────────
// Support chat (public — no auth required)
// ─────────────────────────────────────────────
app.post("/make-server-45108270/support/chat", async (c) => {
  try {
    const body = await c.req.json();
    const reply = createBotReply({ message: body?.message, path: body?.path });
    return c.json({ reply });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 400);
  }
});

app.post("/make-server-45108270/support/ticket", async (c) => {
  try {
    const body = await c.req.json();
    const result = await fileSupportTicket({
      email: body?.email,
      subject: body?.subject,
      message: body?.message,
      path: body?.path,
    });
    return c.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 400);
  }
});

Deno.serve(app.fetch);

