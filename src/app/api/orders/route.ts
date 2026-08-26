import { guard, json } from "@/lib/api";
import { publish } from "@/lib/bus";
import { guestGate, verifyTableToken } from "@/lib/guest";
import { getTableByNumber, getVenueBySlug, listTableOrders, placeTableOrder } from "@/lib/repo";

/**
 * Guest: send the table's shared cart to the kitchen as one order.
 *
 * The lines come from the cart on the server, never from the request body, so
 * whatever every phone at the table put in the draft goes out together and
 * prices cannot be tampered with on the way.
 */
export async function POST(req: Request) {
  return guard(async () => {
    const body = (await req.json()) as { slug?: string; table?: number; note?: string; t?: string };
    if (!body.slug || body.table == null) return json({ error: "bad_request" }, 400);

    const blocked = guestGate(req, body.slug, Number(body.table), body.t, 10, "order");
    if (blocked) return blocked;
    const venue = await getVenueBySlug(body.slug);
    if (!venue) return json({ error: "venue_not_found" }, 404);
    if (!venue.featureOrdering) return json({ error: "feature_disabled" }, 403);
    const tableRow = await getTableByNumber(venue.id, Number(body.table));
    if (!tableRow) return json({ error: "table_not_found" }, 404);

    try {
      const order = await placeTableOrder(venue.id, tableRow.id, body.note?.slice(0, 200));
      publish(venue.id, { kind: "order.created", data: order });
      return json(order);
    } catch (e) {
      // Losing the race against another phone at the same table lands here too:
      // the winner already took the cart, so there is nothing left to send.
      if (e instanceof Error && e.message === "empty_order") return json({ error: "empty_order" }, 400);
      throw e;
    }
  });
}

/** Guest: recent orders for this table. */
export async function GET(req: Request) {
  return guard(async () => {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug");
    const table = url.searchParams.get("table");
    if (!slug || !table) return json({ error: "bad_request" }, 400);
    if (!verifyTableToken(slug, Number(table), url.searchParams.get("t"))) {
      return json({ error: "invalid_table_token" }, 403);
    }
    const venue = await getVenueBySlug(slug);
    if (!venue) return json({ error: "venue_not_found" }, 404);
    const tableRow = await getTableByNumber(venue.id, Number(table));
    if (!tableRow) return json([]);
    const orders = await listTableOrders(venue.id, tableRow.id);
    return json(
      orders.map((o) => ({
        id: o.id,
        status: o.status,
        paid: o.paid,
        totalMinor: o.totalMinor,
        createdAt: o.createdAt,
        items: o.items.map((i) => ({ nameSnap: i.nameSnap, qty: i.qty, choicesSnap: i.choicesSnap })),
      }))
    );
  });
}
