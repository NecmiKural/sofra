import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import LogoutButton from "./logout-button";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  // Unauthenticated → the login page renders bare; protected pages redirect themselves.
  if (!user) return <>{children}</>;

  const nav = [
    ["/admin", "⚡ Live"],
    ["/admin/menu", "📖 Menu"],
    ["/admin/tables", "🪑 Tables"],
    ["/admin/analytics", "📊 Analytics"],
    ["/admin/settings", "⚙️ Settings"],
  ] as const;

  return (
    <div className="min-h-screen">
      <header className="no-print sticky top-0 z-30 border-b line" style={{ background: "var(--card)" }}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3">
          <Link href="/admin" className="mr-2 flex items-center gap-2 font-bold">
            🍽️ Sofra
          </Link>
          <nav className="flex flex-1 flex-wrap gap-1 text-sm">
            {nav.map(([href, label]) => (
              <Link key={href} href={href} className="chip px-3 py-1.5">
                {label}
              </Link>
            ))}
          </nav>
          <a
            href={`/m/${user.venue.slug}?table=1`}
            target="_blank"
            className="chip px-3 py-1.5 text-sm"
            rel="noreferrer"
          >
            👁 View menu
          </a>
          <span className="hidden text-sm muted sm:inline">{user.venue.name}</span>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
