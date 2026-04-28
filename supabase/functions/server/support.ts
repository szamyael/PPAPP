import * as kv from "./kv_store.ts";

type SupportChatInput = {
  message: unknown;
  path?: unknown;
};

type SupportTicketInput = {
  email?: unknown;
  subject: unknown;
  message: unknown;
  path?: unknown;
};

const normalizeText = (value: unknown, field: string, max = 4000) => {
  if (typeof value !== "string") throw new Error(`${field} must be a string`);
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${field} is required`);
  if (trimmed.length > max) throw new Error(`${field} is too long`);
  return trimmed;
};

const optionalText = (value: unknown, max = 400) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
};

export function createBotReply(input: SupportChatInput): string {
  const message = normalizeText(input.message, "message", 800);
  const lower = message.toLowerCase();

  if (lower.includes("payment") || lower.includes("stripe")) {
    return "Payments use Stripe Checkout (demo). If checkout fails, try again or file a ticket with what you clicked and any error message.";
  }

  if (lower.includes("login") || lower.includes("sign in") || lower.includes("password")) {
    return "If you can’t log in, double-check your email and try again. If it persists, file a ticket with your account email and what you see on screen.";
  }

  if (lower.includes("book") || lower.includes("booking") || lower.includes("session")) {
    return "For bookings: pick a tutor, select time + duration, then proceed to payment. If something doesn’t work, file a ticket with the tutor name and the step where it fails.";
  }

  return "I can help with payments, login, bookings, and general navigation. If this looks like a bug or a concern, use the ‘File Ticket’ tab so developers can review it.";
}

export async function fileSupportTicket(input: SupportTicketInput) {
  const subject = normalizeText(input.subject, "subject", 200);
  const message = normalizeText(input.message, "message", 4000);

  const email = optionalText(input.email, 320);
  const path = optionalText(input.path, 500);

  const id = `support_ticket:${new Date().toISOString()}:${crypto.randomUUID()}`;

  await kv.set(id, {
    id,
    createdAt: new Date().toISOString(),
    email,
    subject,
    message,
    path,
    status: "open",
  });

  return { id };
}

