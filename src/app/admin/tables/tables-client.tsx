"use client";

import { useEffect, useState } from "react";

type TableRow = { id: string; number: number; label: string | null; token: string };

export default function TablesClient({ initialTables, slug }: { initialTables: TableRow[]; slug: string }) {
  const [tables, setTables] = useState<TableRow[]>(initialTables);
  const [count, setCount] = useState("1");
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => setOrigin(window.location.origin), []);

  const menuUrl = (t: TableRow) => `${origin}/m/${slug}?table=${t.number}&t=${t.token}`;

  const add = async () => {
    const res = await fetch("/api/tables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count: parseInt(count, 10) || 1 }),
    });
    if (res.ok) setTables(await res.json());
  };

  const remove = async (t: TableRow) => {
    if (!confirm(`Delete table ${t.number}?`)) return;
    await fetch(`/api/tables/${t.id}`, { method: "DELETE" });
    setTables((prev) => prev.filter((x) => x.id !== t.id));
  };

  const rename = async (t: TableRow) => {
    const label = prompt("Label (e.g. Terrace 2)", t.label ?? "");
    if (label === null) return;
    await fetch(`/api/tables/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: label || null }),
    });
    setTables((prev) => prev.map((x) => (x.id === t.id ? { ...x, label: label || null } : x)));
  };

  const copy = async (t: TableRow) => {
    await navigator.clipboard.writeText(menuUrl(t));
    setCopied(t.id);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Tables</h1>
        <div className="flex items-center gap-2">
          <input className="input w-20" inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} />
          <button onClick={add} className="btn-primary px-4 py-2 text-sm">+ Add tables</button>
          <a href="/admin/tables/print" target="_blank" className="btn-ghost px-4 py-2 text-sm" rel="noreferrer">
            🖨 Print QR sheet
          </a>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {tables.map((t) => (
          <div key={t.id} className="card p-4 text-center">
            {origin && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/qr?data=${encodeURIComponent(menuUrl(t))}&size=256`}
                alt={`QR table ${t.number}`}
                className="mx-auto h-36 w-36 rounded-lg bg-white p-1"
              />
            )}
            <div className="mt-2 font-bold">Table {t.number}</div>
            {t.label && <div className="text-sm muted">{t.label}</div>}
            <div className="mt-2 flex justify-center gap-1.5 text-xs">
              <button onClick={() => copy(t)} className="chip px-2.5 py-1">{copied === t.id ? "✓ Copied" : "Copy link"}</button>
              <a href={menuUrl(t)} target="_blank" className="chip px-2.5 py-1" rel="noreferrer">Open</a>
              <button onClick={() => rename(t)} className="chip px-2.5 py-1">✎</button>
              <button onClick={() => remove(t)} className="chip px-2.5 py-1">🗑</button>
            </div>
          </div>
        ))}
      </div>
      {tables.length === 0 && <p className="card p-6 muted">No tables yet. Add your first table above.</p>}
    </div>
  );
}
