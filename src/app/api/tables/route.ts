import { guard, json } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { addTables, listTables } from "@/lib/repo";

export async function GET() {
  return guard(async () => {
    const user = await requireUser();
    return json(await listTables(user.venueId));
  });
}

export async function POST(req: Request) {
  return guard(async () => {
    const user = await requireUser();
    const { count } = (await req.json()) as { count?: number };
    const c = Math.max(1, Math.min(100, Math.round(count ?? 1)));
    return json(await addTables(user.venueId, c));
  });
}
