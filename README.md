# BrokerSodo — broker-managed listing platform (Phase 1)

Next.js 15 (App Router, TypeScript strict) · Tailwind v4 (brand tokens in `src/app/globals.css`) · Prisma + PostgreSQL · Auth.js v5 · next-intl (EN / አማርኛ) · S3-compatible image storage · Leaflet/OSM.

The client's original logo is `public/brand/original/broker-sodo-logo.webp`; `npm run brand` regenerates every logo, favicon and share image from it. Colours and fonts come from `BrokerSodo-Brand-Kit`.

## Run locally

Requires Node 22 and PostgreSQL 14+ with the `pg_trgm` and `unaccent` extensions (included in standard installs).

```bash
npm install
cp .env.example .env          # fill DATABASE_URL, AUTH_SECRET, SEED_ADMIN_*
npm run db:migrate            # prisma migrate deploy (incl. full-text search trigger)
npm run db:seed               # categories, areas, 46 sample listings, admin user
npm run dev                   # http://localhost:3000  — admin at /admin
```

Useful scripts: `npm run lint`, `npm run typecheck`, `npm run build`, `npm test` (unit), `npm run test:e2e` (Playwright, needs a built app + seeded DB), `npm run brand` (regenerate logos and icons).

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection |
| `AUTH_SECRET` | yes | Auth.js secret (`npx auth secret`). Keep it stable after launch |
| `SITE_URL` / `NEXT_PUBLIC_SITE_URL` | yes | Public URL, no trailing slash (canonicals, sitemap, share links) |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` / `SEED_ADMIN_NAME` | for seeding | First admin account |
| `S3_ENDPOINT` / `S3_REGION` / `S3_BUCKET` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` / `S3_PUBLIC_URL` | production | Image storage. If empty in development, uploads go to `public/uploads` |
| `NODE_HEAP_MB` | optional | Container Node heap limit (default 320) |

## Deploy

See [DEPLOY-ALETCLOUD.md](DEPLOY-ALETCLOUD.md). For production data use `npm run db:seed:launch`, which adds no sample listings. `npm run db:seed` is for local sample data only.

## Architecture notes

- `src/app/[locale]/(public)` public site · `src/app/(admin)/admin` staff CMS · `src/server/{queries,actions}` · `src/lib/{search,storage,validators,format,auth,…}`.
- Owner contact fields are never selected on public routes (`src/server/queries/selects.ts`). Every admin action re-checks auth + role on the server.
- Categories define their own fields (`attributeSchema`) via the visual schema builder — no migrations needed.
- Add Wolaita later: add `"wo"` to `src/i18n/routing.ts` and create `messages/wo.json`.
- Out of scope (not built): payments / paid featured listings, public accounts, Telegram bot, saved-search alerts.

## Sample photos

The sample listing photos in `public/placeholders` are CC0 / public-domain images found through [Openverse](https://openverse.org). Sources are listed in `public/placeholders/CREDITS.json`. Replace them with real property photos before launch.
