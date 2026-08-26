import { subscribe, type LiveEvent } from "@/lib/bus";
import { verifyTableToken } from "@/lib/guest";
import { getTableByNumber, getVenueBySlug } from "@/lib/repo";

export const dynamic = "force-dynamic";

/**
 * News a guest is allowed to hear. Anything else on the venue bus (another
 * table's order, staff activity) never reaches a phone.
 */
const GUEST_KINDS: ReadonlySet<LiveEvent["kind"]> = new Set([
  "cart.updated",
  "order.created",
  "order.updated",
  "payment.updated",
  "request.created",
  "request.updated",
] as const);

/**
 * SSE stream for one table's phones, so a cart edit shows up on everyone
 * else's screen at once instead of on the next poll.
 *
 * Only the event kind is forwarded, never its payload: the phone refetches
 * through the endpoints it is already allowed to read. That keeps this stream
 * incapable of leaking anything the table could not fetch anyway.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  const table = url.searchParams.get("table");
  if (!slug || !table) return new Response("bad_request", { status: 400 });
  if (!verifyTableToken(slug, Number(table), url.searchParams.get("t"))) {
    return new Response("invalid_table_token", { status: 403 });
  }

  const venue = await getVenueBySlug(slug);
  if (!venue) return new Response("venue_not_found", { status: 404 });
  const tableRow = await getTableByNumber(venue.id, Number(table));
  if (!tableRow) return new Response("table_not_found", { status: 404 });

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let ping: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: LiveEvent) => {
        if (event.tableId !== tableRow.id) return;
        if (!GUEST_KINDS.has(event.kind)) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ kind: event.kind })}\n\n`));
        } catch {}
      };
      unsubscribe = subscribe(venue.id, send);
      controller.enqueue(encoder.encode(`data: {"kind":"hello"}\n\n`));
      // Proxies drop a silent connection; a comment line keeps it warm.
      ping = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {}
      }, 25000);
    },
    cancel() {
      unsubscribe?.();
      if (ping) clearInterval(ping);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
