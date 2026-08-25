import { getSessionUser } from "@/lib/auth";
import { subscribe, type LiveEvent } from "@/lib/bus";

export const dynamic = "force-dynamic";

/** SSE stream for the staff live panel. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return new Response("unauthorized", { status: 401 });

  const venueId = user.venueId;
  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let ping: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: LiveEvent) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {}
      };
      unsubscribe = subscribe(venueId, send);
      controller.enqueue(encoder.encode(`data: {"kind":"hello"}\n\n`));
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
