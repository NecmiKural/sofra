import { guard, json } from "@/lib/api";
import { guestGate, verifyTableToken } from "@/lib/guest";
import {
  addCartLine,
  clearTableCart,
  getTableByNumber,
  getVenueBySlug,
  listTableCart,
  setCartLineQty,
} from "@/lib/repo";

/**
 * The shared table cart. Every phone at a table reads and writes the same
 * draft, so the table sends one order instead of one per person.
 *
 * Cart edits are far more frequent than orders (a tap per quantity change),
 * hence the roomier limit.
 */
const CART_WRITE_LIMIT = 40;

type Body = {
  slug?: string;
  table?: number;
  t?: string;
  itemId?: string;
  qty?: number;
  choiceIds?: string[];
  lineId?: string;
};

/** Resolves the venue and table behind a guest request, or an error Response.
 * Draft carts are never published onto the live bus: staff must not see a
 * table's half-built cart as if it were an order. */
async function resolveTable(slug: string, table: number) {
  const venue = await getVenueBySlug(slug);
  if (!venue) return { error: json({ error: "venue_not_found" }, 404) };
  if (!venue.featureOrdering) return { error: json({ error: "feature_disabled" }, 403) };
  const tableRow = await getTableByNumber(venue.id, table);
  if (!tableRow) return { error: json({ error: "table_not_found" }, 404) };
  return { venue, tableRow };
}

/** Guest: read the table's shared cart. Polled, so it only checks the token. */
export async function GET(req: Request) {
  return guard(async () => {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug");
    const table = url.searchParams.get("table");
    if (!slug || !table) return json({ error: "bad_request" }, 400);
    if (!verifyTableToken(slug, Number(table), url.searchParams.get("t"))) {
      return json({ error: "invalid_table_token" }, 403);
    }
    const resolved = await resolveTable(slug, Number(table));
    if ("error" in resolved) return resolved.error;
    return json(await listTableCart(resolved.venue.id, resolved.tableRow.id));
  });
}

/** Guest: add a line to the table's cart. */
export async function POST(req: Request) {
  return guard(async () => {
    const body = (await req.json()) as Body;
    if (!body.slug || body.table == null || !body.itemId) return json({ error: "bad_request" }, 400);
    const blocked = guestGate(req, body.slug, Number(body.table), body.t, CART_WRITE_LIMIT, "cart");
    if (blocked) return blocked;

    const resolved = await resolveTable(body.slug, Number(body.table));
    if ("error" in resolved) return resolved.error;

    try {
      const cart = await addCartLine(resolved.venue.id, resolved.tableRow.id, {
        itemId: body.itemId,
        qty: Number(body.qty) || 1,
        choiceIds: Array.isArray(body.choiceIds) ? body.choiceIds.slice(0, 20) : [],
      });
      return json(cart);
    } catch (e) {
      if (e instanceof Error && (e.message === "item_not_found" || e.message === "cart_full")) {
        return json({ error: e.message }, 400);
      }
      throw e;
    }
  });
}

/** Guest: change a line's quantity. Zero removes it. */
export async function PATCH(req: Request) {
  return guard(async () => {
    const body = (await req.json()) as Body;
    if (!body.slug || body.table == null || !body.lineId || body.qty == null) {
      return json({ error: "bad_request" }, 400);
    }
    const blocked = guestGate(req, body.slug, Number(body.table), body.t, CART_WRITE_LIMIT, "cart");
    if (blocked) return blocked;

    const resolved = await resolveTable(body.slug, Number(body.table));
    if ("error" in resolved) return resolved.error;

    const cart = await setCartLineQty(resolved.venue.id, resolved.tableRow.id, body.lineId, Number(body.qty));
    return json(cart);
  });
}

/** Guest: empty the table's cart. */
export async function DELETE(req: Request) {
  return guard(async () => {
    const body = (await req.json()) as Body;
    if (!body.slug || body.table == null) return json({ error: "bad_request" }, 400);
    const blocked = guestGate(req, body.slug, Number(body.table), body.t, CART_WRITE_LIMIT, "cart");
    if (blocked) return blocked;

    const resolved = await resolveTable(body.slug, Number(body.table));
    if ("error" in resolved) return resolved.error;

    await clearTableCart(resolved.venue.id, resolved.tableRow.id);
    return json([]);
  });
}
