"use client";

import { useState } from "react";
import { evenShare, type TableBill } from "@/lib/bill";
import type { GuestDict } from "@/lib/i18n";
import { formatMoney, toMinor } from "@/lib/money";

const MIN_PEOPLE = 2;
const MAX_PEOPLE = 12;

/**
 * The table's bill and the three ways a table actually pays one: all of it,
 * an even share, or a figure someone types in. All three end up sending an
 * amount, so the server needs no notion of "modes" at all.
 */
export default function BillPanel({
  bill,
  currency,
  lang,
  t,
  busy,
  onPay,
}: {
  bill: TableBill;
  currency: string;
  lang: string;
  t: GuestDict;
  busy: boolean;
  onPay: (amountMinor: number) => void;
}) {
  const [mode, setMode] = useState<"none" | "split" | "custom">("none");
  const [people, setPeople] = useState(2);
  const [custom, setCustom] = useState("");

  const money = (minor: number) => formatMoney(minor, currency, lang);
  // The server caps the last payer at whatever is genuinely left.
  const share = evenShare(bill.remainingMinor, people);
  const customMinor = Math.min(toMinor(custom), bill.remainingMinor);

  return (
    <div className="card p-3" style={{ borderColor: "var(--venue-primary)" }}>
      <div className="flex items-baseline justify-between">
        <span className="text-sm muted">{t.billRemaining}</span>
        <span className="text-xl font-bold" style={{ color: "var(--venue-primary)" }}>
          {money(bill.remainingMinor)}
        </span>
      </div>
      {bill.paidMinor > 0 && (
        <p className="mt-0.5 text-xs muted">{t.billPaidSoFar.replace("{amount}", money(bill.paidMinor))}</p>
      )}

      <button onClick={() => onPay(bill.remainingMinor)} disabled={busy} className="btn-primary mt-3 w-full px-4 py-3">
        💳 {t.payAll} · {money(bill.remainingMinor)}
      </button>

      <div className="mt-2 flex gap-2">
        <button
          onClick={() => setMode((m) => (m === "split" ? "none" : "split"))}
          className="btn-ghost flex-1 px-3 py-2 text-sm"
          aria-expanded={mode === "split"}
        >
          👥 {t.paySplit}
        </button>
        <button
          onClick={() => setMode((m) => (m === "custom" ? "none" : "custom"))}
          className="btn-ghost flex-1 px-3 py-2 text-sm"
          aria-expanded={mode === "custom"}
        >
          ✏️ {t.payCustom}
        </button>
      </div>

      {mode === "split" && (
        <div className="mt-3 border-t pt-3 line">
          <div className="flex items-center justify-between">
            <span className="text-sm">{t.people}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPeople((n) => Math.max(MIN_PEOPLE, n - 1))}
                className="btn-ghost h-9 w-9 text-lg"
                aria-label="-"
              >
                −
              </button>
              <span className="w-8 text-center font-semibold">{people}</span>
              <button
                onClick={() => setPeople((n) => Math.min(MAX_PEOPLE, n + 1))}
                className="btn-ghost h-9 w-9 text-lg"
                aria-label="+"
              >
                +
              </button>
            </div>
          </div>
          <button onClick={() => onPay(share)} disabled={busy} className="btn-primary mt-3 w-full px-4 py-3">
            {t.perPerson} · {money(share)}
          </button>
          <p className="mt-1.5 text-xs muted">{t.splitHint}</p>
        </div>
      )}

      {mode === "custom" && (
        <div className="mt-3 border-t pt-3 line">
          <label className="text-sm" htmlFor="bill-amount">
            {t.amount}
          </label>
          <input
            id="bill-amount"
            className="input mt-1.5"
            inputMode="decimal"
            placeholder={money(bill.remainingMinor)}
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
          />
          <button
            onClick={() => onPay(customMinor)}
            disabled={busy || customMinor <= 0}
            className="btn-primary mt-3 w-full px-4 py-3"
          >
            {t.pay} · {money(customMinor)}
          </button>
        </div>
      )}
    </div>
  );
}
