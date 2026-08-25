import { guard, json } from "@/lib/api";
import { publish } from "@/lib/bus";
import { createOrder, getTableByNumber, getVenueBySlug, listTableOrders, type OrderLineInput } from "@/lib/repo";

/** Guest: place an order from the cart. Prices are always computed server-side. */
export async function POST(req: Request) {
  return guard(async () => {
    const body = (await req.json()) as { slug?: string; table?: number; note?: string; items?: OrderLineInput[] };
    if (!body.slug || body.table == null || !Array.isArray(body.items) || body.items.length === 0) {
      return json({ error: "bad_request" }, 400);
    }
    const venue = await getVenueBySlug(body.slug);
    if (!venue) return json({ error: "venue_not_found" }, 404);
    if (!venue.featureOrdering) return json({ error: "feature_disabled" }, 403);
    const tableRow = await getTableByNumber(venue.id, Number(body.table));
    if (!tableRow) return json({ error: "table_not_found" }, 404);

    try {
      const order = await createOrder(venue.id, tableRow.id, body.items.slice(0, 30), body.note?.slice(0, 200));
      publish(venue.id, { kind: "order.created", data: order });
      return json(order);
    } catch (e) {
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
