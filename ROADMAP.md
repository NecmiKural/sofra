# Roadmap

Sofra follows semantic versioning. Each tagged release publishes a Docker image
to `ghcr.io` and redeploys the live demo.

## v0.1 (current)

QR menus per table with signed table tokens, rate limited guest endpoints,
multilingual menu data, categories and option groups,
call waiter / request bill, shared table ordering (every phone at a table sees
the same orders, and staff see the table's tickets grouped so the whole table is
served together), pay at the table with a pluggable
provider, printable QR sheets, scan analytics, per-venue theming and feature
toggles, Docker self-host.

## v0.2

- Stripe and iyzico payment adapters
- Image upload for menu items

## v0.3

- Multiple branches per account
- Staff accounts and roles
- Kitchen display screen (KDS)
- Per-item view analytics

## v1.0

- Multi-instance realtime (Redis pub/sub) in place of the in-process event bus
- PostgreSQL support alongside SQLite
- Menu import (PDF / CSV)
- Web push notifications
- Theme gallery
