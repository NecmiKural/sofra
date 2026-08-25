import { guard, json } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { deleteCategory, updateCategory } from "@/lib/repo";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  return guard(async () => {
    const user = await requireUser();
    const { id } = await ctx.params;
    const patch = (await req.json()) as { nameJson?: string; sort?: number; parentId?: string | null };
    await updateCategory(id, user.venueId, patch);
    return json({ ok: true });
  });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  return guard(async () => {
    const user = await requireUser();
    const { id } = await ctx.params;
    await deleteCategory(id, user.venueId);
    return json({ ok: true });
  });
}
