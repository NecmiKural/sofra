# 🍽️ Sofra

**Open-source QR menu, table service and payments for restaurants, cafés, bars and hotels.**

*Türkçe README için: [README.tr.md](README.tr.md)*

Sofra turns every table into a live QR menu. Guests scan the table's QR code and get the menu in their language; they can call a waiter, request the bill, order from the table and even pay online. Staff see everything land on a live panel the second it happens. No app downloads, no POS hardware, no commission — it runs on your own server.

> "Sofra" is Turkish for a set dining table.

## Live demo

**[sofra-demo.onrender.com](https://sofra-demo.onrender.com)**

- Guest menu — [/m/demo?table=1](https://sofra-demo.onrender.com/m/demo?table=1)
- Staff panel — [/admin](https://sofra-demo.onrender.com/admin) · `admin@sofra.local` / `sofra123`

The demo runs on a free instance: it sleeps after 15 minutes idle (first request takes about a minute to wake it) and resets to seed data when it restarts. Order and pay freely — nothing you do there sticks around.

## Features

- **Table-tied QR menus** — each table gets its own QR; scanning opens the menu already tagged with the table number
- **Instant updates** — change a price once, every table sees it live
- **Multilingual** — menu content is translated data (per-language fields), never baked into images; add languages in settings
- **Categories & subcategories** with photos or emoji, prep times, dietary tags (popular / vegetarian / vegan / spicy / gluten-free)
- **Option groups** — portions with their own prices, paid extras, sizes, sugar levels
- **Live table actions** — call waiter & request bill, streamed to the staff panel over SSE
- **Table ordering** — cart, notes, server-side pricing, live order statuses
- **Pay at the table** — pluggable payment layer; ships with a demo provider, Stripe/iyzico adapters are on the roadmap
- **Feature toggles** — waiter / bill / ordering / payments can each be switched per venue
- **Theming** — per-venue brand color, light / dark / auto
- **Printable QR sheets** — one card per table, ready for lamination
- **Scan analytics** — scans per day and per table, request/order/revenue counters
- **Self-host friendly** — Prisma + SQLite in a single file, versioned migrations, single Docker container

## Quick start

Requires **Node.js >= 18.18**.

```bash
git clone <this-repo> sofra && cd sofra
cp .env.example .env
npm install         # runs `prisma generate`
npm run db:seed     # applies migrations, then seeds a demo venue with a full bilingual menu
npm run dev
```

- Guest menu: http://localhost:3000/m/demo?table=1
- Staff panel: http://localhost:3000/admin — `admin@sofra.local` / `sofra123`

Changed the schema? `npm run db:migrate` creates and applies a new migration
(`npm run db:push` is the no-migration shortcut for throwaway experiments).

## Deploy

### Docker

Every release publishes a multi-arch image:

```bash
docker run -d -p 3000:3000 \
  -v sofra-data:/app/data \
  -e SESSION_SECRET="$(openssl rand -hex 32)" \
  ghcr.io/OWNER/sofra:latest
```

Migrations run automatically on start. Set `SEED_DEMO=1` on the first run to load
the demo venue. Or use the bundled compose file:

```bash
docker compose up --build
```

### Render

The repo ships a [`render.yaml`](render.yaml) blueprint. Point Render at your fork
and it builds the Dockerfile, generates a session secret and boots a free instance.

Any host that runs a container with a persistent volume works the same way —
Sofra needs one long-lived process (the live panel holds an SSE connection) and
a writable directory for the SQLite file.

## How it works

1. **Guest scans the table QR** → `/m/{venue}?table=N` opens, menu is rendered in their language.
2. **They browse, order, call, or request the bill** → requests are validated and priced server-side.
3. **Staff sees it live** → the panel at `/admin` receives events over Server-Sent Events, tagged with the table number. Nothing to refresh.

## Project structure

```
prisma/schema.prisma   # data model
prisma/migrations/     # versioned SQL migrations
scripts/seed.ts        # demo data
src/lib/db.ts          # PrismaClient singleton
src/lib/repo.ts        # typed data access layer
src/lib/payments/      # payment provider abstraction (mock, stripe skeleton)
src/app/m/[slug]/      # guest menu
src/app/admin/         # staff panel (live, menu editor, tables, analytics, settings)
src/app/api/           # REST + SSE endpoints
```

See [ROADMAP.md](ROADMAP.md) for what's next.

## Configuration

| Env var | Default | Description |
|---|---|---|
| `DATABASE_URL` | `file:../data/sofra.db` | Prisma SQLite connection string. Relative paths resolve from `prisma/`; use an absolute one in containers (`file:/app/data/sofra.db`) |
| `SESSION_SECRET` | dev fallback | Sign-in cookie secret — set a long random string |
| `BASE_URL` | request host | Used on printable QR sheets |
| `SEED_DEMO` | unset | Set to `1` to seed the demo venue on container start |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | `admin@sofra.local` / `sofra123` | Seed credentials |

## Security notes (v0.1)

Tables are addressed by plain numbers in the QR URL. Duplicate open requests are coalesced per table. Signed per-table tokens and rate limiting are planned for v0.2.

## Contributing

Issues and PRs are welcome. Keep PRs focused, describe the venue scenario you're solving, and add seed data when a feature needs it.

## License

[MIT](LICENSE)
