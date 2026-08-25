import { guard, json } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { deleteTable, updateTable } from "@/lib/repo";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  return guard(async () => {
    const user = await requireUser();
    const { id } = await ctx.params;
    const { label } = (await req.json()) as { label?: string | null };
    await updateTable(id, user.venueId, label ?? null);
    return json({ ok: true });
  });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  return guard(async () => {
    const user = await requireUser();
    const { id } = await ctx.params;
    await deleteTable(id, user.venueId);
    return json({ ok: true });
  });
}
