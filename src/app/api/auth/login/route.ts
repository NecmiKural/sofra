import { guard, json } from "@/lib/api";
import { setSessionCookie, verifyPassword } from "@/lib/auth";
import { getUserByEmail } from "@/lib/repo";

export async function POST(req: Request) {
  return guard(async () => {
    const { email, password } = (await req.json()) as { email?: string; password?: string };
    if (!email || !password) return json({ error: "missing_fields" }, 400);
    const user = await getUserByEmail(email);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return json({ error: "invalid_credentials" }, 401);
    }
    await setSessionCookie(user.id);
    return json({ ok: true });
  });
}
