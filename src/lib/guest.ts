import { createHmac, timingSafeEqual } from "crypto";
import { json } from "./api";

const SECRET =
  process.env.TABLE_TOKEN_SECRET || process.env.SESSION_SECRET || "sofra-dev-secret-change-me";

const TOKEN_LENGTH = 16;

/**
 * Short HMAC that binds a table number to its venue. Printed into QR links as
 * `?t=` so guest endpoints can tell "scanned this table's QR" from "guessed a
 * table number". Deterministic, so reprinting sheets is never required unless
 * the secret rotates.
 */
export function tableToken(slug: string, number: number): string {
  return createHmac("sha256", SECRET).update(`${slug}.${number}`).digest("hex").slice(0, TOKEN_LENGTH);
}

export function verifyTableToken(slug: string, number: number, token: string | null | undefined): boolean {
  if (!token || !Number.isInteger(number)) return false;
  const given = Buffer.from(token);
  const expected = Buffer.from(tableToken(slug, number));
  if (given.length !== expected.length) return false;
  return timingSafeEqual(given, expected);
}

/** Attaches the QR token to admin-facing table rows. */
export function withTableTokens<T extends { number: number }>(slug: string, tables: T[]): (T & { token: string })[] {
  return tables.map((t) => ({ ...t, token: tableToken(slug, t.number) }));
}

// ponytail: in-process fixed window, fine while the event bus is in-process too.
// Swap for Redis at the same time we go multi-instance (v1.0).
const WINDOW_MS = 60_000;
const MAX_KEYS = 5000;
const hits = new Map<string, { count: number; resetAt: number }>();

/** Fixed-window counter. Returns false once `limit` is exceeded within a minute. */
export function rateLimit(key: string, limit: number): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.resetAt <= now) {
    if (hits.size > MAX_KEYS) {
      for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
    }
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= limit) return false;
  hits.set(key, { ...entry, count: entry.count + 1 });
  return true;
}

/** Venue WiFi puts every guest behind one IP, so buckets are per IP *and* table. */
function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}

/**
 * Guard for guest write endpoints: the QR token must match the table, and the
 * device may only act a handful of times per minute. Returns an error Response
 * to hand straight back, or null when the request may proceed.
 */
export function guestGate(
  req: Request,
  slug: string,
  table: number,
  token: string | null | undefined,
  limit: number
): Response | null {
  if (!verifyTableToken(slug, table, token)) return json({ error: "invalid_table_token" }, 403);
  if (!rateLimit(`${clientIp(req)}:${slug}:${table}`, limit)) return json({ error: "rate_limited" }, 429);
  return null;
}

/** Rate limit for guest endpoints that have no table context (payment confirm). */
export function ipLimit(req: Request, scope: string, limit: number): Response | null {
  if (!rateLimit(`${clientIp(req)}:${scope}`, limit)) return json({ error: "rate_limited" }, 429);
  return null;
}
