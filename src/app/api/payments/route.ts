import { guard, json } from "@/lib/api";
import { guestGate, tableToken } from "@/lib/guest";
import { getProvider } from "@/lib/payments";
import { createPayment, getTableByNumber, getVenueBySlug, setPaymentRef, unpaidOrdersForTable } from "@/lib/repo";

/** Guest: create a payment for the table's unpaid orders. */
export async function POST(req: Request) {
  return guard(async () => {
    const { slug, table, returnUrl, t } = (await req.json()) as {
      slug?: string;
      table?: number;
      returnUrl?: string;
      t?: string;
    };
    if (!slug || table == null) return json({ error: "bad_request" }, 400);
    const blocked = guestGate(req, slug, Number(table), t, 6);
    if (blocked) return blocked;
    const venue = await getVenueBySlug(slug);
    if (!venue) return json({ error: "venue_not_found" }, 404);
    if (!venue.featurePayments) return json({ error: "feature_disabled" }, 403);
    const tableRow = await getTableByNumber(venue.id, Number(table));
    if (!tableRow) return json({ error: "table_not_found" }, 404);

    const unpaid = await unpaidOrdersForTable(venue.id, tableRow.id);
    const amount = unpaid.reduce((s, o) => s + o.totalMinor, 0);
    if (amount <= 0) return json({ error: "nothing_to_pay" }, 400);

    const payment = await createPayment(venue.id, tableRow.number, unpaid.map((o) => o.id), amount, venue.paymentProvider);
    const provider = getProvider(venue.paymentProvider);
    try {
      const { checkoutUrl, providerRef } = await provider.createCheckout({
        paymentId: payment.id,
        amountMinor: amount,
        currency: venue.currency,
        description: `${venue.name}, table ${tableRow.number}`,
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
