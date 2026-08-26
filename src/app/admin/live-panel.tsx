"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { tj } from "@/lib/i18n";
import { groupOrdersByTable, type OrderGroup } from "@/lib/table-orders";
import { formatMoney } from "@/lib/money";

type Req = { id: string; tableNumber: number | null; type: string; status: string; createdAt: number };
type OrderItem = { nameSnap: string; qty: number; unitPriceMinor: number; choicesSnap: string };
type Ord = {
  id: string;
  tableNumber: number | null;
  status: string;
  totalMinor: number;
  note: string | null;
  paid: boolean;
  createdAt: number;
  items: OrderItem[];
};
type Pay = { id: string; tableNumber: number | null; amountMinor: number; status: string; createdAt: number };

export default function LivePanel({
  initialRequests,
  initialOrders,
  initialPayments,
  currency,
  defaultLang,
}: {
  initialRequests: Req[];
  initialOrders: Ord[];
  initialPayments: Pay[];
  currency: string;
  defaultLang: string;
}) {
  const [requests, setRequests] = useState<Req[]>(initialRequests);
  const [orders, setOrders] = useState<Ord[]>(initialOrders);
  const [payments, setPayments] = useState<Pay[]>(initialPayments);
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [, setTick] = useState(0);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const beep = useCallback(() => {
    if (mutedRef.current) return;
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {}
  }, []);

  const reconcile = useCallback(async () => {
    try {
      const res = await fetch("/api/live");
      if (!res.ok) return;
      const data = await res.json();
      setRequests(data.requests ?? []);
      setOrders(data.orders ?? []);
      setPayments(data.payments ?? []);
    } catch {}
  }, []);

  useEffect(() => {
    let es: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      es = new EventSource("/api/events");
      es.onopen = () => setConnected(true);
      es.onmessage = (msg) => {
        try {
          const event = JSON.parse(msg.data) as { kind: string; data?: unknown };
          if (event.kind === "request.created") {
            const r = event.data as Req;
            setRequests((prev) => (prev.some((x) => x.id === r.id) ? prev : [...prev, r]));
            beep();
          } else if (event.kind === "request.updated") {
            const r = event.data as Req;
            setRequests((prev) =>
              r.status === "resolved" ? prev.filter((x) => x.id !== r.id) : prev.map((x) => (x.id === r.id ? r : x))
            );
          } else if (event.kind === "order.created") {
            const o = event.data as Ord;
            setOrders((prev) => (prev.some((x) => x.id === o.id) ? prev : [o, ...prev]));
            beep();
          } else if (event.kind === "order.updated") {
            const o = event.data as Ord;
            setOrders((prev) => prev.map((x) => (x.id === o.id ? o : x)));
          } else if (event.kind === "payment.updated") {
            reconcile();
          }
        } catch {}
      };
      es.onerror = () => {
        setConnected(false);
        es?.close();
        retry = setTimeout(connect, 3000);
      };
    };
    connect();

    const iv = setInterval(reconcile, 30000);
    const tick = setInterval(() => setTick((n) => n + 1), 15000);
    return () => {
      es?.close();
      if (retry) clearTimeout(retry);
      clearInterval(iv);
      clearInterval(tick);
    };
  }, [beep, reconcile]);

  const patchRequest = async (id: string, status: string) => {
    await fetch(`/api/requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  };

  const patchOrder = async (id: string, status: string) => {
    await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  };

  const activeOrders = orders.filter((o) => o.status === "new" || o.status === "in_progress");
  const orderGroups = groupOrdersByTable(activeOrders);
  const doneOrders = orders.filter((o) => o.status === "done" || o.status === "cancelled").slice(0, 10);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Live panel</h1>
        <div className="flex items-center gap-2 text-sm">
          <button onClick={() => setMuted((m) => !m)} className="chip px-3 py-1">
            {muted ? "🔇 Muted" : "🔔 Sound on"}
          </button>
          <span className={`chip px-3 py-1 ${connected ? "" : "pulse-soft"}`}>
            {connected ? "● Live" : "○ Reconnecting…"}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Requests */}
        <section>
          <h2 className="mb-3 font-semibold">🙋 Table requests {requests.length > 0 && `(${requests.length})`}</h2>
          <div className="space-y-3">
            {requests.length === 0 && <p className="card p-4 text-sm muted">No active requests.</p>}
            {requests.map((r) => (
              <div key={r.id} className={`card p-4 ${r.status === "open" ? "pulse-soft" : ""}`} style={r.status === "open" ? { borderColor: "var(--venue-primary)" } : undefined}>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold">
                    {r.type === "waiter" ? "🙋" : "🧾"} Table {r.tableNumber ?? "?"}
                  </span>
                  <span className="text-xs muted">{ago(r.createdAt)}</span>
                </div>
                <p className="mt-0.5 text-sm muted">{r.type === "waiter" ? "Waiter call" : "Bill request"}</p>
                <div className="mt-3 flex gap-2">
                  {r.status === "open" && (
                    <button onClick={() => patchRequest(r.id, "acked")} className="btn-ghost flex-1 px-3 py-1.5 text-sm">
                      👀 On it
                    </button>
                  )}
                  <button onClick={() => patchRequest(r.id, "resolved")} className="btn-primary flex-1 px-3 py-1.5 text-sm">
                    ✓ Done
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Orders */}
        <section>
          <h2 className="mb-3 font-semibold">🛒 Orders {activeOrders.length > 0 && `(${activeOrders.length})`}</h2>
          <div className="space-y-3">
            {activeOrders.length === 0 && <p className="card p-4 text-sm muted">No active orders.</p>}
            {orderGroups.map((g) => (
              <TableGroupCard key={g.key} group={g} currency={currency} lang={defaultLang} onPatch={patchOrder} />
            ))}
            {doneOrders.length > 0 && (
              <details className="card p-3 text-sm">
                <summary className="cursor-pointer muted">Recently finished ({doneOrders.length})</summary>
                <div className="mt-2 space-y-2">
                  {doneOrders.map((o) => (
                    <div key={o.id} className="flex items-center justify-between border-t pt-2 line">
                      <span>Table {o.tableNumber ?? "?"} · {o.status}{o.paid ? " · paid ✓" : ""}</span>
                      <span className="font-medium">{formatMoney(o.totalMinor, currency, defaultLang)}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        </section>

        {/* Payments */}
        <section>
          <h2 className="mb-3 font-semibold">💳 Payments</h2>
          <div className="space-y-2">
            {payments.length === 0 && <p className="card p-4 text-sm muted">No payments yet today.</p>}
            {payments.map((p) => (
              <div key={p.id} className="card flex items-center justify-between p-3 text-sm">
                <span>
                  Table {p.tableNumber ?? "?"} <span className="muted">· {ago(p.createdAt)}</span>
                </span>
                <span className="flex items-center gap-2 font-semibold">
                  {formatMoney(p.amountMinor, currency, defaultLang)}
                  <span
                    className="rounded-full px-2 py-0.5 text-xs text-white"
                    style={{ background: p.status === "paid" ? "#16a34a" : p.status === "failed" ? "#dc2626" : "#d97706" }}
                  >
                    {p.status}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

/**
 * One table's tickets, kept together so the whole table is served at once.
 * A table with a single ticket renders as a plain card, no extra chrome.
 */
function TableGroupCard({
  group,
  currency,
  lang,
  onPatch,
}: {
  group: OrderGroup<Ord>;
  currency: string;
  lang: string;
  onPatch: (id: string, status: string) => void;
}) {
  if (group.orders.length === 1) {
    return <OrderCard order={group.orders[0]} currency={currency} lang={lang} onPatch={onPatch} />;
  }
  const patchAll = (status: string) => group.orders.forEach((o) => onPatch(o.id, status));
  return (
    <div className="rounded-2xl border-2 p-2" style={{ borderColor: "var(--venue-primary)" }}>
      <div className="flex items-center justify-between px-2 pt-1">
        <span className="text-lg font-bold">
          Table {group.tableNumber ?? "?"} · {group.orders.length} tickets
        </span>
        <span className="text-xs muted">first {ago(group.oldest)}</span>
      </div>
      <p className="px-2 pb-2 text-xs muted">
        Serve together · {formatMoney(group.totalMinor, currency, lang)}
      </p>
      <div className="space-y-2">
        {group.orders.map((o) => (
          <OrderCard key={o.id} order={o} currency={currency} lang={lang} onPatch={onPatch} />
        ))}
      </div>
      <div className="mt-2 flex gap-2 px-2 pb-1">
        <button onClick={() => patchAll("in_progress")} className="btn-ghost flex-1 px-3 py-1.5 text-sm">
          👨‍🍳 Start all
        </button>
        <button onClick={() => patchAll("done")} className="btn-primary flex-1 px-3 py-1.5 text-sm">
          ✓ All done
        </button>
      </div>
    </div>
  );
}

function OrderCard({ order, currency, lang, onPatch }: { order: Ord; currency: string; lang: string; onPatch: (id: string, status: string) => void }) {
  return (
    <div className={`card p-4 ${order.status === "new" ? "pulse-soft" : ""}`} style={order.status === "new" ? { borderColor: "var(--venue-primary)" } : undefined}>
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold">Table {order.tableNumber ?? "?"}</span>
        <span className="text-xs muted">{ago(order.createdAt)}</span>
      </div>
      <ul className="mt-2 space-y-1 text-sm">
        {order.items.map((it, i) => (
          <li key={i}>
            <span className="font-medium">{it.qty}×</span> {tj(it.nameSnap, lang)}
            {it.choicesSnap && <span className="muted"> · {choices(it.choicesSnap, lang)}</span>}
          </li>
        ))}
      </ul>
      {order.note && <p className="mt-2 rounded-lg px-2 py-1 text-sm italic muted" style={{ background: "var(--bg)" }}>📝 {order.note}</p>}
      <div className="mt-2 flex items-center justify-between text-sm">
        <span className="font-bold">{formatMoney(order.totalMinor, currency, lang)}</span>
        {order.paid && <span className="rounded-full bg-green-600 px-2 py-0.5 text-xs text-white">paid ✓</span>}
      </div>
      <div className="mt-3 flex gap-2">
        {order.status === "new" && (
          <button onClick={() => onPatch(order.id, "in_progress")} className="btn-ghost flex-1 px-3 py-1.5 text-sm">
            🍳 Preparing
          </button>
        )}
        <button onClick={() => onPatch(order.id, "done")} className="btn-primary flex-1 px-3 py-1.5 text-sm">
          ✓ Done
        </button>
        <button onClick={() => onPatch(order.id, "cancelled")} className="btn-ghost px-3 py-1.5 text-sm">
          ✕
        </button>
      </div>
    </div>
  );
}

function choices(snap: string, lang: string): string {
  try {
    return (JSON.parse(snap) as string[]).map((n) => tj(n, lang)).join(", ");
  } catch {
    return snap;
  }
}

function ago(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}
