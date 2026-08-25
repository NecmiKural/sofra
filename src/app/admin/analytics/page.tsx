import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { analytics } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");

  const a = await analytics(user.venueId);
  const maxDay = Math.max(1, ...a.byDay.map((d) => d.scans));
  const maxTable = Math.max(1, ...a.byTable.map((t) => t.scans));

  const cards = [
    ["Scans today", a.scanToday],
    ["Scans · 7 days", a.scanWeek],
    ["Scans · total", a.scanTotal],
    ["Requests · 7 days", a.requestsWeek],
    ["Orders · 7 days", a.ordersWeek],
    ["Paid · 7 days", formatMoney(a.revenueWeek, user.venue.currency, "en")],
  ] as const;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Analytics</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map(([label, value]) => (
          <div key={label} className="card p-4">
            <div className="text-xs muted">{label}</div>
            <div className="mt-1 text-2xl font-bold">{value}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="font-semibold">Scans per day (14 days)</h2>
          <div className="mt-4 space-y-2">
            {a.byDay.length === 0 && <p className="text-sm muted">No scans recorded yet.</p>}
            {a.byDay.map((d) => (
              <div key={d.day} className="flex items-center gap-3 text-sm">
                <span className="w-24 shrink-0 muted">{d.day.slice(5)}</span>
                <div className="h-4 rounded-full" style={{ width: `${(d.scans / maxDay) * 100}%`, minWidth: 8, background: "var(--venue-primary)" }} />
                <span className="font-medium">{d.scans}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card p-5">
          <h2 className="font-semibold">Scans per table (30 days)</h2>
          <div className="mt-4 space-y-2">
            {a.byTable.length === 0 && <p className="text-sm muted">No scans recorded yet.</p>}
            {a.byTable.map((t, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="w-24 shrink-0 muted">{t.tableNumber != null ? `Table ${t.tableNumber}` : "No table"}</span>
                <div className="h-4 rounded-full" style={{ width: `${(t.scans / maxTable) * 100}%`, minWidth: 8, background: "var(--venue-primary)" }} />
                <span className="font-medium">{t.scans}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <p className="mt-6 text-xs muted">
        Roadmap: per-dish view analytics, busy-hour heatmap, CSV export.
      </p>
    </div>
  );
}
