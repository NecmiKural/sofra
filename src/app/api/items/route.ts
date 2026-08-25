import { guard, json } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { createItem, listItems, type ItemPayload } from "@/lib/repo";

export async function GET() {
  return guard(async () => {
    const user = await requireUser();
    return json(await listItems(user.venueId));
  });
}

export async function POST(req: Request) {
  return guard(async () => {
    const user = await requireUser();
    const payload = (await req.json()) as ItemPayload;
    if (!payload.categoryId || !payload.nameJson || payload.priceMinor == null) {
      return json({ error: "missing_fields" }, 400);
    }
    return json(await createItem(user.venueId, payload));
  });
}
