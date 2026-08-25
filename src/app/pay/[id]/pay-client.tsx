"use client";

import { useState } from "react";
import { guestDict } from "@/lib/i18n";
import { formatMoney } from "@/lib/money";

export default function PayClient({
  paymentId,
  amountMinor,
  currency,
  venueName,
  tableNumber,
  initialStatus,
  themePrimary,
  returnUrl,
  defaultLang,
}: {
  paymentId: string;
  amountMinor: number;
  currency: string;
  venueName: string;
  tableNumber: number | null;
  initialStatus: string;
  themePrimary: string;
  returnUrl: string | null;
  defaultLang: string;
}) {
  const t = guestDict(defaultLang);
  const [status, setStatus] = useState(initialStatus);
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/payments/${paymentId}`, { method: "POST" });
      const data = await res.json();
      setStatus(data.status ?? "failed");
      if (data.status === "paid" && returnUrl) {
        setTimeout(() => (window.location.href = returnUrl), 1200);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center p-6"
      style={{ "--venue-primary": themePrimary } as React.CSSProperties}
    >
      <div className="card w-full max-w-sm p-6 text-center">
        <div className="text-4xl">🧾</div>
        <h1 className="mt-3 text-lg font-bold">{venueName}</h1>
        {tableNumber != null && (
          <p className="text-sm muted">
            {t.table} {tableNumber} · {t.payTitle}
          </p>
        )}
        <div className="mt-5 text-4xl font-bold" style={{ color: "var(--venue-primary)" }}>
          {formatMoney(amountMinor, currency, defaultLang)}
        </div>

        {status === "paid" ? (
          <div className="mt-6 rounded-xl bg-green-600 px-4 py-3 font-semibold text-white">✓ {t.paymentSuccess}</div>
        ) : status === "failed" ? (
          <div className="mt-6 rounded-xl bg-red-600 px-4 py-3 font-semibold text-white">{t.paymentFailed}</div>
        ) : (
          <button onClick={confirm} disabled={busy} className="btn-primary mt-6 w-full px-4 py-3.5">
            💳 {t.payNow}
          </button>
        )}

        <p className="mt-4 text-xs muted">
          Demo checkout — no real charge. Swap in Stripe/iyzico via <code>src/lib/payments</code>.
        </p>
      </div>
    </div>
  );
}
