import { guard, json } from "@/lib/api";
import { guestGate, tableToken } from "@/lib/guest";
import { getProvider } from "@/lib/payments";
import {
  createPayment,
  getTableBill,
  getTableByNumber,
  getVenueBySlug,
  setPaymentRef,
  unpaidOrdersForTable,
} from "@/lib/repo";

/**
 * Guest: start a payment against the table's bill.
 *
 * `amountMinor` is what makes splitting work. Left out, the whole remaining
 * bill is charged. Sent, that amount is charged instead, which covers both
 * "split it between us" and "here is my share": the client only has to do the
 * arithmetic, and the server caps it at what is actually still owed so a
 * stale screen can never overcharge a guest.
 */
export async function POST(req: Request) {
  return guard(async () => {
    const { slug, table, returnUrl, t, amountMinor } = (await req.json()) as {
      slug?: string;
      table?: number;
      returnUrl?: string;
      t?: string;
      amountMinor?: number;
    };
    if (!slug || table == null) return json({ error: "bad_request" }, 400);
    const blocked = guestGate(req, slug, Number(table), t, 6, "payment");
    if (blocked) return blocked;
    const venue = await getVenueBySlug(slug);
    if (!venue) return json({ error: "venue_not_found" }, 404);
    if (!venue.featurePayments) return json({ error: "feature_disabled" }, 403);
    const tableRow = await getTableByNumber(venue.id, Number(table));
    if (!tableRow) return json({ error: "table_not_found" }, 404);

    const bill = await getTableBill(venue.id, tableRow.id);
    if (bill.remainingMinor <= 0) return json({ error: "nothing_to_pay" }, 400);

    const requested = amountMinor == null ? bill.remainingMinor : Math.round(Number(amountMinor));
    if (!Number.isFinite(requested) || requested <= 0) return json({ error: "bad_amount" }, 400);
    const amount = Math.min(requested, bill.remainingMinor);

    // The order ids are a record of what was outstanding at checkout time.
    // A split payment settles the bill by amount, not by picking orders.
    const unpaid = await unpaidOrdersForTable(venue.id, tableRow.id);
    const payment = await createPayment(venue.id, tableRow.number, unpaid.map((o) => o.id), amount, venue.paymentProvider);
    const provider = getProvider(venue.paymentProvider);
    try {
      const { checkoutUrl, providerRef } = await provider.createCheckout({
        paymentId: payment.id,
        amountMinor: amount,
        currency: venue.currency,
        description:
          amount < bill.remainingMinor
            ? `${venue.name}, table ${tableRow.number} (part of the bill)`
            : `${venue.name}, table ${tableRow.number}`,
        returnUrl:
          returnUrl ||
          `/m/${venue.slug}?table=${tableRow.number}&t=${tableToken(venue.slug, tableRow.number)}`,
      });
      if (providerRef) await setPaymentRef(payment.id, providerRef);
      return json({ paymentId: payment.id, checkoutUrl });
    } catch (e) {
      return json({ error: "provider_error", message: e instanceof Error ? e.message : "unknown" }, 502);
    }
  });
}
