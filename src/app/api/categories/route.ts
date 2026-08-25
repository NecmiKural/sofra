import { guard, json } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { createCategory, listCategories } from "@/lib/repo";

export async function GET() {
  return guard(async () => {
    const user = await requireUser();
    return json(await listCategories(user.venueId));
  });
}

export async function POST(req: Request) {
  return guard(async () => {
    const user = await requireUser();
    const { nameJson, parentId } = (await req.json()) as { nameJson?: string; parentId?: string | null };
    if (!nameJson) return json({ error: "missing_name" }, 400);
    return json(await createCategory(user.venueId, nameJson, parentId ?? null));
  });
}
