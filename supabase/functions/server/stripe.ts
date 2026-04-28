import Stripe from "npm:stripe@16.2.0";

type CreateCheckoutSessionInput = {
  amountCents: unknown;
  currency?: unknown;
  description?: unknown;
  metadata?: unknown;
  origin?: string;
};

const getReturnBaseUrl = (origin?: string): string => {
  const configured = Deno.env.get("FRONTEND_URL");
  if (configured) return configured.replace(/\/$/, "");
  if (origin) return origin.replace(/\/$/, "");
  return "http://localhost:5173";
};

const parseAmountCents = (value: unknown): number => {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount) || !Number.isInteger(amount)) {
    throw new Error("amountCents must be an integer");
  }
  if (amount <= 0) throw new Error("amountCents must be > 0");
  return amount;
};

const parseCurrency = (value: unknown): string => {
  if (typeof value === "string" && value.trim()) return value.trim().toLowerCase();
  return "usd";
};

const parseDescription = (value: unknown): string => {
  if (typeof value === "string" && value.trim()) return value.trim();
  return "Tutoring session";
};

const parseMetadata = (value: unknown): Record<string, string> | undefined => {
  if (!value || typeof value !== "object") return undefined;
  const record: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (raw === null || raw === undefined) continue;
    record[key] = typeof raw === "string" ? raw : JSON.stringify(raw);
  }
  return Object.keys(record).length ? record : undefined;
};

export async function createCheckoutSession(input: CreateCheckoutSessionInput) {
  const secretKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!secretKey) throw new Error("Missing STRIPE_SECRET_KEY env var");

  const amountCents = parseAmountCents(input.amountCents);
  const currency = parseCurrency(input.currency);
  const description = parseDescription(input.description);
  const metadata = parseMetadata(input.metadata);

  // Metadata MUST include student_id, tutor_id, and booking fields
  // so the webhook can create the booking row without querying the frontend.
  if (metadata && !metadata.student_id) {
    console.warn(
      "createCheckoutSession: metadata missing student_id — webhook cannot fulfill booking",
    );
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: "2024-06-20",
    httpClient: Stripe.createFetchHttpClient(),
  });

  const baseUrl = getReturnBaseUrl(input.origin);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency,
          unit_amount: amountCents,
          product_data: { name: description },
        },
      },
    ],
    // Pass session_id so the frontend can verify the booking was created
    success_url: `${baseUrl}/payment?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/payment?checkout=cancelled`,
    metadata,
  });

  if (!session.url) throw new Error("Stripe session did not return a checkout URL");

  return { url: session.url, id: session.id };
}

