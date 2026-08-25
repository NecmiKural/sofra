import { guard, json } from "@/lib/api";
import { publish } from "@/lib/bus";
import { ipLimit } from "@/lib/guest";
import { getProvider } from "@/lib/payments";
import { getPayment, getVenueById, markOrdersPaid, setPaymentStatus } from "@/lib/repo";

type Ctx = { params: Promise<{ id: string }> };

/** Public: payment info for the checkout page. */
export async function GET(_req: Request, ctx: Ctx) {
  return guard(async () => {
    const { id } = await ctx.params;
    const payment = await getPayment(id);
    if (!payment) return json({ error: "not_found" }, 404);
    const venue = await getVenueById(payment.venueId);
    return json({
      id: payment.id,
      amountMinor: payment.amountMinor,
      status: payment.status,
      tableNumber: payment.tableNumber,
      venueName: venue?.name ?? "",
      currency: venue?.currency ?? "TRY",
      themePrimary: venue?.themePrimary ?? "#c2410c",
    });
  });
}

/** Public: confirm the payment (mock provider confirms instantly). */
export async function POST(req: Request, ctx: Ctx) {
  return guard(async () => {
    const blocked = ipLimit(req, "payment-confirm", 20);
    if (blocked) return blocked;
    const { id } = await ctx.params;
    const payment = await getPayment(id);
    if (!payment) return json({ error: "not_found" }, 404);
    if (payment.status === "paid") return json({ status: "paid" });

    const provider = getProvider(payment.provider);
    const { ok } = await provider.confirm(payment.id, payment.providerRef);
    const updated = await setPaymentStatus(payment.id, ok ? "paid" : "failed");
    if (ok) {
      const orderIds = payment.orderIds.split(",").filter(Boolean);
      await markOrdersPaid(orderIds);
      publish(payment.venueId, { kind: "payment.updated", data: updated });
    }
    return json({ status: updated?.status ?? "failed" });
  });
}
