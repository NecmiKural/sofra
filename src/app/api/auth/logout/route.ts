import { guard, json } from "@/lib/api";
import { clearSessionCookie } from "@/lib/auth";

export async function POST() {
  return guard(async () => {
    await clearSessionCookie();
    return json({ ok: true });
  });
}
