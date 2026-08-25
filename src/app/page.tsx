import Link from "next/link";

const features = [
  ["⚡", "Instant updates", "Change a price once, every table sees it live. No reprints."],
  ["🌍", "Multilingual", "Menu text is translated data, never baked into an image."],
  ["🖐️", "Live table actions", "Call waiter, request bill, order, all straight to the staff panel."],
  ["💳", "Pay at the table", "Pluggable payment layer with a demo provider built in."],
  ["🎨", "Your brand", "Per-venue colors, light & dark, emoji or photo menus."],
  ["🐳", "Self-hosted", "One Docker container, SQLite inside. No commission, ever."],
] as const;

export default function Landing() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <div className="flex items-center gap-3">
        <span className="text-4xl">🍽️</span>
        <h1 className="text-3xl font-bold tracking-tight">Sofra</h1>
        <span className="chip px-3 py-1 text-xs muted">open source · MIT</span>
      </div>

      <p className="mt-6 max-w-2xl text-xl leading-relaxed">
        Open-source QR menu, table service and payments for restaurants, cafés,
        bars and hotels. <span className="muted">Your table, ready in a tap, on your own server.</span>
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/m/demo?table=1" className="btn-primary px-5 py-3">
          Open the demo menu →
        </Link>
        <Link href="/admin" className="btn-ghost px-5 py-3">
          Staff panel
        </Link>
      </div>
      <p className="mt-3 text-sm muted">
        Demo login: <code>admin@sofra.local</code> / <code>sofra123</code>
      </p>

      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(([icon, title, desc]) => (
          <div key={title} className="card p-5">
            <div className="text-2xl">{icon}</div>
            <h3 className="mt-2 font-semibold">{title}</h3>
            <p className="mt-1 text-sm muted">{desc}</p>
          </div>
        ))}
      </div>

      <footer className="mt-16 border-t pt-6 text-sm muted line">
        Sofra · MIT licensed · Built with Next.js, Prisma & SQLite
      </footer>
    </main>
  );
}
