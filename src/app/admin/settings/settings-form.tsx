"use client";

import { useState } from "react";
import { packJson } from "@/lib/i18n";

type Venue = {
  id: string;
  slug: string;
  name: string;
  welcomeJson: string;
  currency: string;
  languages: string;
  defaultLang: string;
  themePrimary: string;
  themeMode: string;
  featureWaiter: boolean;
  featureBill: boolean;
  featureOrdering: boolean;
  featurePayments: boolean;
  paymentProvider: string;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  hours: string | null;
  address: string | null;
};

export default function SettingsForm({ venue }: { venue: Venue }) {
  const languages = venue.languages.split(",").filter(Boolean);
  const initialWelcome = (() => {
    try {
      return JSON.parse(venue.welcomeJson) as Record<string, string>;
    } catch {
      return {};
    }
  })();

  const [name, setName] = useState(venue.name);
  const [welcome, setWelcome] = useState<Record<string, string>>(
    Object.fromEntries(languages.map((l) => [l, initialWelcome[l] ?? ""]))
  );
  const [currency, setCurrency] = useState(venue.currency);
  const [langs, setLangs] = useState(venue.languages);
  const [defaultLang, setDefaultLang] = useState(venue.defaultLang);
  const [themePrimary, setThemePrimary] = useState(venue.themePrimary);
  const [themeMode, setThemeMode] = useState(venue.themeMode);
  const [flags, setFlags] = useState({
    featureWaiter: venue.featureWaiter,
    featureBill: venue.featureBill,
    featureOrdering: venue.featureOrdering,
    featurePayments: venue.featurePayments,
  });
  const [paymentProvider, setPaymentProvider] = useState(venue.paymentProvider);
  const [phone, setPhone] = useState(venue.phone ?? "");
  const [whatsapp, setWhatsapp] = useState(venue.whatsapp ?? "");
  const [instagram, setInstagram] = useState(venue.instagram ?? "");
  const [hours, setHours] = useState(venue.hours ?? "");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/venue", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          welcomeJson: packJson(welcome),
          currency,
          languages: langs.split(",").map((l) => l.trim()).filter(Boolean).join(","),
          defaultLang,
          themePrimary,
          themeMode,
          ...flags,
          paymentProvider,
          phone: phone || null,
          whatsapp: whatsapp || null,
          instagram: instagram || null,
          hours: hours || null,
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setBusy(false);
    }
  };

  const flagDefs = [
    ["featureWaiter", "🙋 Call waiter"],
    ["featureBill", "🧾 Request bill"],
    ["featureOrdering", "🛒 Table ordering"],
    ["featurePayments", "💳 Online payments"],
  ] as const;

  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-2xl font-bold">Settings</h1>

      <div className="space-y-5">
        <section className="card space-y-3 p-5">
          <h2 className="font-semibold">Identity</h2>
          <label className="block text-sm">
            <span className="muted">Venue name</span>
            <input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <div className="text-sm muted">Menu URL: /m/{venue.slug}?table=1</div>
          {languages.map((l) => (
            <label key={l} className="block text-sm">
              <span className="muted">Welcome message ({l.toUpperCase()})</span>
              <input
                className="input mt-1"
                value={welcome[l] ?? ""}
                onChange={(e) => setWelcome({ ...welcome, [l]: e.target.value })}
              />
            </label>
          ))}
        </section>

        <section className="card space-y-3 p-5">
          <h2 className="font-semibold">Features — turn on only what you need</h2>
          <div className="flex flex-wrap gap-2">
            {flagDefs.map(([key, label]) => (
              <label key={key} className={`chip cursor-pointer px-4 py-2 text-sm ${flags[key] ? "active" : ""}`}>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={flags[key]}
                  onChange={(e) => setFlags({ ...flags, [key]: e.target.checked })}
                />
                {label}
              </label>
            ))}
          </div>
          <label className="block max-w-xs text-sm">
            <span className="muted">Payment provider</span>
            <select className="input mt-1" value={paymentProvider} onChange={(e) => setPaymentProvider(e.target.value)}>
              <option value="mock">mock (demo checkout)</option>
              <option value="stripe">stripe (needs configuration)</option>
            </select>
          </label>
        </section>

        <section className="card space-y-3 p-5">
          <h2 className="font-semibold">Languages & currency</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-sm">
              <span className="muted">Languages (comma separated)</span>
              <input className="input mt-1" value={langs} onChange={(e) => setLangs(e.target.value)} placeholder="tr,en" />
            </label>
            <label className="block text-sm">
              <span className="muted">Default language</span>
              <select className="input mt-1" value={defaultLang} onChange={(e) => setDefaultLang(e.target.value)}>
                {langs.split(",").map((l) => l.trim()).filter(Boolean).map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="muted">Currency</span>
              <select className="input mt-1" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                {["TRY", "USD", "EUR", "GBP"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>
          <p className="text-xs muted">Adding a language here adds translation fields across the menu editor.</p>
        </section>

        <section className="card space-y-3 p-5">
          <h2 className="font-semibold">Theme</h2>
          <div className="flex flex-wrap items-end gap-4">
            <label className="block text-sm">
              <span className="muted">Brand color</span>
              <input type="color" className="mt-1 h-10 w-20 cursor-pointer rounded border line" value={themePrimary} onChange={(e) => setThemePrimary(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="muted">Mode</span>
              <select className="input mt-1" value={themeMode} onChange={(e) => setThemeMode(e.target.value)}>
                <option value="auto">auto (follow device)</option>
                <option value="light">always light</option>
                <option value="dark">always dark</option>
              </select>
            </label>
            <span className="rounded-xl px-4 py-2 text-sm font-semibold text-white" style={{ background: themePrimary }}>
              Preview
            </span>
          </div>
        </section>

        <section className="card space-y-3 p-5">
          <h2 className="font-semibold">Contact (shown at the bottom of the menu)</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="muted">Phone</span>
              <input className="input mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+90 ..." />
            </label>
            <label className="block text-sm">
              <span className="muted">WhatsApp</span>
              <input className="input mt-1" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+90 ..." />
            </label>
            <label className="block text-sm">
              <span className="muted">Instagram</span>
              <input className="input mt-1" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@venue" />
            </label>
            <label className="block text-sm">
              <span className="muted">Hours</span>
              <input className="input mt-1" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="09:00–23:00" />
            </label>
          </div>
        </section>

        <button onClick={save} disabled={busy} className="btn-primary w-full px-4 py-3">
          {saved ? "✓ Saved" : "Save settings"}
        </button>
      </div>
    </div>
  );
}
