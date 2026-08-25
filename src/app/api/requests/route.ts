import { guard, json } from "@/lib/api";
import { publish } from "@/lib/bus";
import { guestGate, verifyTableToken } from "@/lib/guest";
import { createRequest, getTableByNumber, getVenueBySlug, listTableRequests } from "@/lib/repo";

/** Guest: call waiter / request bill. */
export async function POST(req: Request) {
  return guard(async () => {
    const { slug, table, type, t } = (await req.json()) as {
      slug?: string;
      table?: number;
      type?: string;
      t?: string;
    };
    if (!slug || table == null || (type !== "waiter" && type !== "bill")) {
      return json({ error: "bad_request" }, 400);
    }
    const blocked = guestGate(req, slug, Number(table), t, 6);
    if (blocked) return blocked;
    const venue = await getVenueBySlug(slug);
    if (!venue) return json({ error: "venue_not_found" }, 404);
    if (type === "waiter" && !venue.featureWaiter) return json({ error: "feature_disabled" }, 403);
    if (type === "bill" && !venue.featureBill) return json({ error: "feature_disabled" }, 403);
    const tableRow = await getTableByNumber(venue.id, Number(table));
    if (!tableRow) return json({ error: "table_not_found" }, 404);

    const request = await createRequest(venue.id, tableRow.id, type);
    publish(venue.id, { kind: "request.created", data: request });
    return json(request);
  });
}

/** Guest: poll own table's open requests. */
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
    const requests = await listTableRequests(venue.id, tableRow.id);
    return json(requests.map((r) => ({ id: r.id, type: r.type, status: r.status })));
  });
}
