import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { listTables } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function PrintPage() {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  const base = process.env.BASE_URL || `${proto}://${host}`;

  const tables = await listTables(user.venueId);

  return (
    <div className="p-6">
      <div className="no-print mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">QR sheet — {user.venue.name}</h1>
        <span className="text-sm muted">Use your browser&apos;s print dialog (Ctrl/Cmd+P). One card per table.</span>
      </div>

      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
        {tables.map((t) => {
          const url = `${base}/m/${user.venue.slug}?table=${t.number}`;
          return (
            <div key={t.id} className="break-inside-avoid rounded-2xl border-2 border-black bg-white p-5 text-center text-black">
              <div className="text-sm font-semibold uppercase tracking-widest">{user.venue.name}</div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/qr?data=${encodeURIComponent(url)}&size=512`} alt="" className="mx-auto my-3 h-44 w-44" />
              <div className="text-2xl font-bold">
                {t.label || `Table ${t.number}`}
              </div>
              <div className="mt-1 text-xs text-neutral-600">Scan for menu · Menü için okutun</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
