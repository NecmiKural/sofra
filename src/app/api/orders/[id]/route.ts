import { guard, json } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { publish } from "@/lib/bus";
import { setOrderStatus } from "@/lib/repo";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  return guard(async () => {
    const user = await requireUser();
    const { id } = await ctx.params;
    const { status } = (await req.json()) as { status?: string };
    if (!status || !["new", "in_progress", "done", "cancelled"].includes(status)) {
      return json({ error: "bad_status" }, 400);
    }
    const order = await setOrderStatus(id, user.venueId, status);
    if (!order) return json({ error: "not_found" }, 404);
    publish(user.venueId, { kind: "order.updated", data: order });
    return json(order);
  });
}
