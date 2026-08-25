import { guard, json } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { deleteItem, updateItem, type ItemPayload } from "@/lib/repo";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  return guard(async () => {
    const user = await requireUser();
    const { id } = await ctx.params;
    const patch = (await req.json()) as Partial<ItemPayload> & { sort?: number };
    const item = await updateItem(id, user.venueId, patch);
    if (!item) return json({ error: "not_found" }, 404);
    return json(item);
  });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  return guard(async () => {
    const user = await requireUser();
    const { id } = await ctx.params;
    await deleteItem(id, user.venueId);
    return json({ ok: true });
  });
}
