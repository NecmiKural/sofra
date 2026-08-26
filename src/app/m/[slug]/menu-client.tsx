"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MenuPayload, PublicCategory, PublicItem } from "@/lib/public-types";
import { guestDict, tj } from "@/lib/i18n";
import { formatMoney } from "@/lib/money";
import { summarizeBill } from "@/lib/bill";
import { priceLine } from "@/lib/pricing";
import BillPanel from "./bill-panel";

/** A line of the table's shared cart, as the server reports it. */
type CartLine = {
  id: string;
  itemId: string;
  nameJson: string;
  qty: number;
  unitMinor: number;
  choiceIds: string[];
  choiceNames: string[]; // nameJson strings
  addedAt: number;
};

type LiveRequest = { id: string; type: string; status: string };
type LiveOrder = {
  id: string;
  status: string;
  paid: boolean;
  totalMinor: number;
  paidMinor: number;
  createdAt: string;
  items: { nameSnap: string; qty: number; choicesSnap: string }[];
};

export default function GuestMenu({ payload, initialLang }: { payload: MenuPayload; initialLang: string }) {
  const { venue, categories, tableNumber, tableToken } = payload;
  const [lang, setLang] = useState(initialLang);
  const t = guestDict(lang);

  const [activeItem, setActiveItem] = useState<PublicItem | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showOrders, setShowOrders] = useState(false);
  const [note, setNote] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [requests, setRequests] = useState<LiveRequest[]>([]);
  const [orders, setOrders] = useState<LiveOrder[]>([]);
  const [busy, setBusy] = useState(false);
  /** Cart writes answer with the whole cart, so a poll landing mid-write would
   *  undo what this phone just did. Skip the poll while a write is open. */
  const pendingWrites = useRef(0);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }, []);

  const refreshRequests = useCallback(async () => {
    if (!tableNumber) return;
    try {
      const res = await fetch(`/api/requests?slug=${venue.slug}&table=${tableNumber}&t=${tableToken}`);
      if (res.ok) setRequests(await res.json());
    } catch {}
  }, [venue.slug, tableNumber, tableToken]);

  const refreshOrders = useCallback(async () => {
    if (!tableNumber || !venue.featureOrdering) return;
    try {
      const res = await fetch(`/api/orders?slug=${venue.slug}&table=${tableNumber}&t=${tableToken}`);
      if (res.ok) setOrders(await res.json());
    } catch {}
  }, [venue.slug, tableNumber, tableToken, venue.featureOrdering]);

  const refreshCart = useCallback(async () => {
    if (!tableNumber || !venue.featureOrdering) return;
    if (pendingWrites.current > 0) return;
    try {
      const res = await fetch(`/api/cart?slug=${venue.slug}&table=${tableNumber}&t=${tableToken}`);
      if (res.ok) setCart(await res.json());
    } catch {}
  }, [venue.slug, tableNumber, tableToken, venue.featureOrdering]);

  /**
   * Send one cart edit and adopt the answer. The endpoint returns the table's
   * whole cart, so every phone converges on the same lines without any
   * merge logic on the client.
   */
  const writeCart = useCallback(
    async (method: "POST" | "PATCH" | "DELETE", body: Record<string, unknown>): Promise<boolean> => {
      pendingWrites.current++;
      try {
        const res = await fetch("/api/cart", {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: venue.slug, table: tableNumber, t: tableToken, ...body }),
        });
        const data = await res.json();
        if (res.ok) {
          setCart(data as CartLine[]);
          return true;
        }
        flash(data.error === "cart_full" ? t.cartFull : t.cartFailed);
        return false;
      } catch {
        flash(t.cartFailed);
        return false;
      } finally {
        pendingWrites.current--;
      }
    },
    [venue.slug, tableNumber, tableToken, flash, t]
  );

  const refreshAll = useCallback(() => {
    refreshRequests();
    refreshOrders();
    refreshCart();
  }, [refreshRequests, refreshOrders, refreshCart]);

  /**
   * Live stream for this table. A phone that changes the shared cart makes
   * every other phone at the table refetch within the same second, which is
   * the difference between a shared cart and a cart that merely catches up.
   *
   * The stream only says *what* changed; the data still comes from the
   * endpoints this phone is allowed to read.
   */
  useEffect(() => {
    if (!tableNumber || !tableToken) return;
    let source: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let backoffMs = 2000;
    let closed = false;

    const connect = () => {
      source = new EventSource(`/api/table-events?slug=${venue.slug}&table=${tableNumber}&t=${tableToken}`);
      source.onopen = () => {
        backoffMs = 2000;
      };
      source.onmessage = (msg) => {
        try {
          const { kind } = JSON.parse(msg.data) as { kind: string };
          if (kind === "cart.updated") refreshCart();
          else if (kind.startsWith("order.") || kind === "payment.updated") refreshOrders();
          else if (kind.startsWith("request.")) refreshRequests();
        } catch {}
      };
      source.onerror = () => {
        source?.close();
        if (closed) return;
        // Back off so a venue full of phones cannot hammer a struggling server.
        retry = setTimeout(connect, backoffMs);
        backoffMs = Math.min(backoffMs * 2, 30000);
      };
    };
    connect();

    return () => {
      closed = true;
      source?.close();
      if (retry) clearTimeout(retry);
    };
  }, [venue.slug, tableNumber, tableToken, refreshCart, refreshOrders, refreshRequests]);

  // Safety net for a dropped stream, and the only sync path when SSE is
  // blocked by a proxy. The stream carries the fast path.
  useEffect(() => {
    refreshAll();
    const iv = setInterval(refreshAll, 20000);
    return () => clearInterval(iv);
  }, [refreshAll]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("paid") === "1") {
      flash(t.paymentSuccess);
      params.delete("paid");
      const qs = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendRequest = async (type: "waiter" | "bill") => {
    if (!tableNumber) return flash("Table?");
    setBusy(true);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: venue.slug, table: tableNumber, type, t: tableToken }),
      });
      if (res.ok) {
        flash(type === "waiter" ? t.waiterCalled : t.billRequested);
        refreshRequests();
      }
    } finally {
      setBusy(false);
    }
  };

  const addToCart = async (item: PublicItem, choiceIds: string[], qty: number) => {
    setActiveItem(null);
    if (await writeCart("POST", { itemId: item.id, qty, choiceIds })) {
      flash(`${tj(item.nameJson, lang)} ✓`);
    }
  };

  const sendOrder = async () => {
    if (!tableNumber || cart.length === 0) return;
    setBusy(true);
    try {
      // The lines come from the table's cart on the server, not from this
      // phone: whatever everyone added goes to the kitchen as one order.
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: venue.slug, table: tableNumber, t: tableToken, note: note || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setCart([]);
        setNote("");
        setShowCart(false);
        flash(t.orderSent);
        refreshOrders();
        setShowOrders(true);
      } else {
        // An empty cart here usually means someone else at the table pressed
        // send a moment earlier and the order is already on its way.
        flash(data.error === "empty_order" ? t.cartAlreadySent : t.orderFailed);
        refreshCart();
        refreshOrders();
      }
    } catch {
      flash(t.orderFailed);
    } finally {
      setBusy(false);
    }
  };

  /** `amountMinor` is the share this phone is paying, not always the whole bill. */
  const payOnline = async (amountMinor: number) => {
    if (!tableNumber || amountMinor <= 0) return;
    setBusy(true);
    try {
      const returnUrl = `${window.location.origin}/m/${venue.slug}?table=${tableNumber}&t=${tableToken}&lang=${lang}&paid=1`;
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: venue.slug, table: tableNumber, returnUrl, t: tableToken, amountMinor }),
      });
      const data = await res.json();
      if (res.ok && data.checkoutUrl) window.location.href = data.checkoutUrl;
      else flash(data.error === "nothing_to_pay" ? t.nothingToPay : t.paymentFailed);
    } finally {
      setBusy(false);
    }
  };

  const cartCount = cart.reduce((s, l) => s + l.qty, 0);
  const cartTotal = cart.reduce((s, l) => s + l.qty * l.unitMinor, 0);
  // The bill is settled by amount, not order by order: a split payment covers
  // part of the table rather than picking someone's plate off the list.
  const bill = summarizeBill(orders);
  const waiterReq = requests.find((r) => r.type === "waiter");
  const billReq = requests.find((r) => r.type === "bill");
  const activeOrderCount = orders.filter((o) => o.status === "new" || o.status === "in_progress").length;

  const themeClass = venue.themeMode === "dark" ? "dark-vars" : venue.themeMode === "light" ? "light-vars" : "";

  return (
    <div
      className={`min-h-screen ${themeClass}`}
      style={{ "--venue-primary": venue.themePrimary, background: "var(--bg)", color: "var(--fg)" } as React.CSSProperties}
    >
      {/* Header */}
      <header className="mx-auto max-w-2xl px-4 pt-6 pb-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold tracking-[0.3em] muted">{t.menu}</span>
          <div className="flex items-center gap-2">
            {tableNumber != null && (
              <span className="chip px-3 py-1 text-xs font-semibold">
                {t.table} {tableNumber}
              </span>
            )}
            {venue.languages.length > 1 && (
              <div className="chip flex overflow-hidden p-0.5 text-xs">
                {venue.languages.map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`rounded-full px-2.5 py-1 font-semibold uppercase ${l === lang ? "btn-primary" : ""}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">{venue.name}</h1>
        {tj(venue.welcomeJson, lang) && <p className="mt-1 muted">{tj(venue.welcomeJson, lang)}</p>}
      </header>

      {/* Category chips */}
      <nav
        className="sticky top-0 z-20 overflow-x-auto px-4 py-3 backdrop-blur"
        style={{ background: "color-mix(in srgb, var(--bg) 85%, transparent)" }}
      >
        <div className="mx-auto flex max-w-2xl gap-2">
          {categories.map((c) => (
            <a key={c.id} href={`#cat-${c.id}`} className="chip px-3.5 py-1.5 text-sm font-medium">
              {tj(c.nameJson, lang)}
            </a>
          ))}
        </div>
      </nav>

      {/* Status banners */}
      {(waiterReq || billReq) && (
        <div className="mx-auto max-w-2xl px-4 pt-2">
          {waiterReq && (
            <Banner text={waiterReq.status === "acked" ? `🙋 ${t.onTheWay}` : `🙋 ${t.waiterCalled}…`} />
          )}
          {billReq && (
            <Banner text={billReq.status === "acked" ? `🧾 ${t.onTheWay}` : `🧾 ${t.billRequested}…`} />
          )}
        </div>
      )}

      {/* Menu sections */}
      <main className="mx-auto max-w-2xl px-4 pb-40">
        {categories.map((cat) => (
          <CategorySection key={cat.id} cat={cat} lang={lang} venueCurrency={venue.currency} onOpen={setActiveItem} depth={0} t={t} />
        ))}

        {/* Venue footer */}
        <footer className="card mt-10 space-y-2 p-5 text-sm">
          {venue.hours && <div>🕐 {venue.hours}</div>}
          <div className="flex flex-wrap gap-3">
            {venue.phone && (
              <a className="underline" href={`tel:${venue.phone.replace(/\s/g, "")}`}>
                {venue.phone}
              </a>
            )}
            {venue.whatsapp && (
              <a className="underline" href={`https://wa.me/${venue.whatsapp.replace(/\D/g, "")}`}>
                WhatsApp
              </a>
            )}
            {venue.instagram && (
              <a className="underline" href={`https://instagram.com/${venue.instagram.replace("@", "")}`}>
                Instagram
              </a>
            )}
          </div>
          <div className="pt-2 text-xs muted">🍽️ {t.poweredBy}</div>
        </footer>
      </main>

      {/* Bottom action bar */}
      {tableNumber != null && (venue.featureWaiter || venue.featureBill || venue.featureOrdering) && (
        <div className="fixed inset-x-0 bottom-0 z-30 no-print">
          <div className="mx-auto flex max-w-2xl gap-2 p-3" style={{ background: "color-mix(in srgb, var(--bg) 92%, transparent)", backdropFilter: "blur(8px)" }}>
            {venue.featureWaiter && (
              <button onClick={() => sendRequest("waiter")} disabled={busy || !!waiterReq} className="btn-ghost flex-1 px-3 py-3 text-sm">
                🙋 {t.callWaiter}
              </button>
            )}
            {venue.featureBill && (
              <button onClick={() => sendRequest("bill")} disabled={busy || !!billReq} className="btn-ghost flex-1 px-3 py-3 text-sm">
                🧾 {t.requestBill}
              </button>
            )}
            {venue.featureOrdering && (
              <button onClick={() => (cartCount > 0 ? setShowCart(true) : setShowOrders(true))} className="btn-primary relative flex-1 px-3 py-3 text-sm">
                🛒 {cartCount > 0 ? `${t.cart} · ${formatMoney(cartTotal, venue.currency, lang)}` : t.orders}
                {activeOrderCount > 0 && cartCount === 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold pulse-soft" style={{ color: "var(--venue-primary)" }}>
                    {activeOrderCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-lg" style={{ background: "var(--venue-primary)" }}>
          {toast}
        </div>
      )}

      {/* Item modal */}
      {activeItem && (
        <ItemModal item={activeItem} lang={lang} currency={venue.currency} ordering={venue.featureOrdering && tableNumber != null} onClose={() => setActiveItem(null)} onAdd={addToCart} t={t} />
      )}

      {/* Cart sheet */}
      {showCart && (
        <Sheet title={`🛒 ${t.cart}`} onClose={() => setShowCart(false)} t={t}>
          {cart.length === 0 ? (
            <p className="muted">{t.empty}</p>
          ) : (
            <div className="space-y-3">
              <p className="text-xs muted">👥 {t.cartShared}</p>
              {cart.map((l) => (
                <div key={l.id} className="card flex items-center gap-3 p-3">
                  <div className="flex-1">
                    <div className="font-medium">{tj(l.nameJson, lang)}</div>
                    {l.choiceNames.length > 0 && (
                      <div className="text-xs muted">{l.choiceNames.map((n) => tj(n, lang)).join(", ")}</div>
                    )}
                    <div className="text-sm font-semibold" style={{ color: "var(--venue-primary)" }}>
                      {formatMoney(l.unitMinor * l.qty, venue.currency, lang)}
                    </div>
                  </div>
                  <QtyControl
                    qty={l.qty}
                    onChange={(q) => {
                      // Echo locally first so the tap feels instant, then let
                      // the server's answer settle it for every phone.
                      setCart((prev) =>
                        q <= 0 ? prev.filter((x) => x.id !== l.id) : prev.map((x) => (x.id === l.id ? { ...x, qty: q } : x))
                      );
                      writeCart("PATCH", { lineId: l.id, qty: q });
                    }}
                  />
                </div>
              ))}
              <input className="input" placeholder={t.note} value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
              {activeOrderCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setShowCart(false);
                    setShowOrders(true);
                  }}
                  className="card w-full p-3 text-left text-sm"
                  style={{ borderColor: "var(--venue-primary)" }}
                >
                  <span className="font-semibold">⚠️ {t.tableBusy.replace("{n}", String(activeOrderCount))}</span>
                  <span className="mt-1 block muted">{t.tableBusyHint}</span>
                  <span className="mt-1 block font-medium underline" style={{ color: "var(--venue-primary)" }}>
                    {t.viewTableOrders} →
                  </span>
                </button>
              )}
              <button onClick={sendOrder} disabled={busy} className="btn-primary w-full px-4 py-3.5">
                {t.sendOrder} · {formatMoney(cartTotal, venue.currency, lang)}
              </button>
            </div>
          )}
        </Sheet>
      )}

      {/* Orders sheet */}
      {showOrders && (
        <Sheet title={`🧾 ${t.orders}`} onClose={() => setShowOrders(false)} t={t}>
          {orders.length === 0 ? (
            <p className="muted">—</p>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => (
                <div key={o.id} className="card p-3">
                  <div className="flex items-center justify-between text-sm">
                    <StatusPill status={o.status} paid={o.paid} t={t} />
                    <span className="font-semibold">{formatMoney(o.totalMinor, venue.currency, lang)}</span>
                  </div>
                  <ul className="mt-2 space-y-1 text-sm muted">
                    {o.items.map((it, i) => (
                      <li key={i}>
                        {it.qty}× {tj(it.nameSnap, lang)}
                        {it.choicesSnap && <span className="text-xs"> · {parseChoices(it.choicesSnap, lang)}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {venue.featurePayments && bill.remainingMinor > 0 && (
                <BillPanel
                  bill={bill}
                  currency={venue.currency}
                  lang={lang}
                  t={t}
                  busy={busy}
                  onPay={payOnline}
                />
              )}
              {venue.featurePayments && bill.totalMinor > 0 && bill.remainingMinor === 0 && (
                <p className="card p-3 text-center text-sm font-semibold">{t.billSettled}</p>
              )}
            </div>
          )}
        </Sheet>
      )}
    </div>
  );
}

/* ---------- helpers & subcomponents ---------- */

function parseChoices(snap: string, lang: string): string {
  try {
    const arr = JSON.parse(snap) as string[];
    return arr.map((n) => tj(n, lang)).join(", ");
  } catch {
    return snap;
  }
}

function Banner({ text }: { text: string }) {
  return (
    <div className="card mb-2 px-4 py-2.5 text-sm font-medium pulse-soft" style={{ borderColor: "var(--venue-primary)" }}>
      {text}
    </div>
  );
}

function CategorySection({
  cat,
  lang,
  venueCurrency,
  onOpen,
  depth,
  t,
}: {
  cat: PublicCategory;
  lang: string;
  venueCurrency: string;
  onOpen: (i: PublicItem) => void;
  depth: number;
  t: ReturnType<typeof guestDict>;
}) {
  return (
    <section id={depth === 0 ? `cat-${cat.id}` : undefined} className={depth === 0 ? "pt-8" : "pt-4"}>
      {depth === 0 ? (
        <h2 className="text-xl font-bold">{tj(cat.nameJson, lang)}</h2>
      ) : (
        <h3 className="text-base font-semibold muted">{tj(cat.nameJson, lang)}</h3>
      )}
      <div className="mt-3 space-y-3">
        {cat.items.map((item) => (
          <ItemCard key={item.id} item={item} lang={lang} currency={venueCurrency} onOpen={onOpen} t={t} />
        ))}
      </div>
      {cat.children.map((sub) => (
        <CategorySection key={sub.id} cat={sub} lang={lang} venueCurrency={venueCurrency} onOpen={onOpen} depth={depth + 1} t={t} />
      ))}
    </section>
  );
}

function TagBadges({ tags, prepMinutes, t }: { tags: string[]; prepMinutes: number | null; t: ReturnType<typeof guestDict> }) {
  const label: Record<string, string> = {
    popular: `★ ${t.popular}`,
    vegetarian: `🌿 ${t.vegetarian}`,
    vegan: `🌱 ${t.vegan}`,
    spicy: `🌶 ${t.spicy}`,
    glutenfree: `🌾 ${t.glutenfree}`,
  };
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px] muted">
      {prepMinutes != null && <span className="chip px-2 py-0.5">~{prepMinutes} {t.min}</span>}
      {tags.map((tag) => label[tag] && (
        <span key={tag} className="chip px-2 py-0.5">{label[tag]}</span>
      ))}
    </div>
  );
}

function ItemCard({ item, lang, currency, onOpen, t }: { item: PublicItem; lang: string; currency: string; onOpen: (i: PublicItem) => void; t: ReturnType<typeof guestDict> }) {
  return (
    <button onClick={() => onOpen(item)} className={`card flex w-full gap-3 p-3 text-left ${item.available ? "" : "opacity-50"}`}>
      {(item.imageUrl || item.emoji) && (
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl text-4xl" style={{ background: "color-mix(in srgb, var(--venue-primary) 12%, var(--card))" }}>
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <span>{item.emoji}</span>
          )}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-semibold">{tj(item.nameJson, lang)}</span>
          <span className="shrink-0 font-bold" style={{ color: "var(--venue-primary)" }}>
            {formatMoney(item.priceMinor, currency, lang)}
          </span>
        </div>
        {tj(item.descJson, lang) && <p className="mt-0.5 line-clamp-2 text-sm muted">{tj(item.descJson, lang)}</p>}
        {!item.available && <p className="mt-1 text-xs font-semibold" style={{ color: "var(--venue-primary)" }}>{t.unavailable}</p>}
        <TagBadges tags={item.tags} prepMinutes={item.prepMinutes} t={t} />
      </div>
    </button>
  );
}

function QtyControl({ qty, onChange }: { qty: number; onChange: (q: number) => void }) {
  return (
    <div className="chip flex items-center gap-3 px-2 py-1">
      <button onClick={() => onChange(qty - 1)} className="px-1.5 text-lg font-bold">−</button>
      <span className="min-w-4 text-center font-semibold">{qty}</span>
      <button onClick={() => onChange(qty + 1)} className="px-1.5 text-lg font-bold">+</button>
    </div>
  );
}

function Sheet({ title, onClose, children, t }: { title: string; onClose: () => void; children: React.ReactNode; t: ReturnType<typeof guestDict> }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl p-5 pb-8" style={{ background: "var(--bg)" }} onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="chip px-3 py-1 text-sm">{t.close}</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function StatusPill({ status, paid, t }: { status: string; paid: boolean; t: ReturnType<typeof guestDict> }) {
  const map: Record<string, [string, string]> = {
    new: [t.pending, "#d97706"],
    in_progress: [t.preparing, "#2563eb"],
    done: [t.done, "#16a34a"],
    cancelled: [t.cancelled, "#dc2626"],
  };
  const [label, color] = map[status] ?? [status, "#78716c"];
  return (
    <span className="flex items-center gap-2 text-xs font-semibold">
      <span className="rounded-full px-2.5 py-1 text-white" style={{ background: color }}>{label}</span>
      {paid && <span className="rounded-full px-2.5 py-1 text-white" style={{ background: "#16a34a" }}>✓ {t.paid}</span>}
    </span>
  );
}

function ItemModal({
  item,
  lang,
  currency,
  ordering,
  onClose,
  onAdd,
  t,
}: {
  item: PublicItem;
  lang: string;
  currency: string;
  ordering: boolean;
  onClose: () => void;
  onAdd: (item: PublicItem, choiceIds: string[], qty: number) => void;
  t: ReturnType<typeof guestDict>;
}) {
  const [qty, setQty] = useState(1);
  const [selected, setSelected] = useState<Record<string, string[]>>(() => {
    const init: Record<string, string[]> = {};
    for (const g of item.optionGroups) {
      init[g.id] = g.type === "single" && g.choices.length > 0 ? [g.choices[0].id] : [];
    }
    return init;
  });

  const choiceIds = useMemo(() => Object.values(selected).flat(), [selected]);
  const { unitMinor: unit } = priceLine(item, choiceIds);

  const toggle = (g: PublicItem["optionGroups"][number], choiceId: string) => {
    setSelected((prev) => {
      const cur = prev[g.id] ?? [];
      if (g.type === "single") return { ...prev, [g.id]: [choiceId] };
      return { ...prev, [g.id]: cur.includes(choiceId) ? cur.filter((c) => c !== choiceId) : [...cur, choiceId] };
    });
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl" style={{ background: "var(--bg)" }} onClick={(e) => e.stopPropagation()}>
        {(item.imageUrl || item.emoji) && (
          <div className="flex h-44 items-center justify-center overflow-hidden text-7xl" style={{ background: "color-mix(in srgb, var(--venue-primary) 14%, var(--card))" }}>
            {item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span>{item.emoji}</span>
            )}
          </div>
        )}
        <div className="p-5 pb-8">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-xl font-bold">{tj(item.nameJson, lang)}</h2>
            <button onClick={onClose} className="chip px-3 py-1 text-sm">✕</button>
          </div>
          {tj(item.descJson, lang) && <p className="mt-1 muted">{tj(item.descJson, lang)}</p>}
          <TagBadges tags={item.tags} prepMinutes={item.prepMinutes} t={t} />

          {item.optionGroups.map((g) => (
            <div key={g.id} className="mt-5">
              <div className="flex items-baseline gap-2">
                <h3 className="font-semibold">{tj(g.nameJson, lang)}</h3>
                <span className="text-xs muted">
                  {g.type === "single" ? t.chooseOne : t.chooseAny}
                  {g.required ? ` · ${t.required}` : ""}
                </span>
              </div>
              <div className="mt-2 space-y-1.5">
                {g.choices.map((c) => {
                  const on = (selected[g.id] ?? []).includes(c.id);
                  return (
                    <button
                      key={c.id}
                      onClick={() => toggle(g, c.id)}
                      className="card flex w-full items-center justify-between px-3.5 py-2.5 text-left text-sm"
                      style={on ? { borderColor: "var(--venue-primary)", boxShadow: "0 0 0 1px var(--venue-primary)" } : undefined}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="flex h-4 w-4 items-center justify-center rounded-full border text-[9px] text-white"
                          style={{ background: on ? "var(--venue-primary)" : "transparent", borderColor: on ? "var(--venue-primary)" : "var(--line)" }}
                        >
                          {on ? "✓" : ""}
                        </span>
                        {tj(c.nameJson, lang)}
                      </span>
                      <span className="muted">
                        {c.priceAbsolute != null
                          ? formatMoney(c.priceAbsolute, currency, lang)
                          : c.priceDelta !== 0
                            ? `+${formatMoney(c.priceDelta, currency, lang)}`
                            : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {ordering && item.available && (
            <div className="mt-6 flex items-center gap-3">
              <QtyControl qty={qty} onChange={(q) => setQty(Math.max(1, q))} />
              <button onClick={() => onAdd(item, choiceIds, qty)} className="btn-primary flex-1 px-4 py-3">
                {t.add} · {formatMoney(unit * qty, currency, lang)}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
