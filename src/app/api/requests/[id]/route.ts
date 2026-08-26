import { guard, json } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { publish } from "@/lib/bus";
import { setRequestStatus } from "@/lib/repo";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  return guard(async () => {
    const user = await requireUser();
    const { id } = await ctx.params;
    const { status } = (await req.json()) as { status?: string };
    if (!status || !["open", "acked", "resolved"].includes(status)) return json({ error: "bad_status" }, 400);
    const request = await setRequestStatus(id, user.venueId, status);
    if (!request) return json({ error: "not_found" }, 404);
    publish(user.venueId, { kind: "request.updated", tableId: request.tableId, data: request });
    return json(request);
  });
}
