import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { getUserById, getVenueById, type User, type Venue } from "./repo";

export { hashPassword, verifyPassword } from "./password";

const SECRET = process.env.SESSION_SECRET || "sofra-dev-secret-change-me";
const COOKIE = "sofra_session";
const MAX_AGE = 60 * 60 * 24 * 14; // 14 days

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("hex");
}

export function createSessionValue(userId: string): string {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const payload = `${userId}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

export function parseSessionValue(value: string | undefined): string | null {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [userId, expStr, sig] = parts;
  const payload = `${userId}.${expStr}`;
  const expected = sign(payload);
  if (sig.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  if (Number(expStr) < Math.floor(Date.now() / 1000)) return null;
  return userId;
}

export async function setSessionCookie(userId: string) {
  const store = await cookies();
  store.set(COOKIE, createSessionValue(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(COOKIE, "", { httpOnly: true, maxAge: 0, path: "/" });
}

export type SessionUser = User & { venue: Venue };

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const userId = parseSessionValue(store.get(COOKIE)?.value);
  if (!userId) return null;
  const user = await getUserById(userId);
  if (!user) return null;
  const venue = await getVenueById(user.venueId);
  if (!venue) return null;
  return { ...user, venue };
}

/** Throws a 401 Response if not authenticated. For API routes. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  return user;
}
