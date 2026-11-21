# BrokerSodo — broker-managed listing platform (Phase 1)

Next.js 15 (App Router, TypeScript strict) · Tailwind v4 (brand tokens in `src/app/globals.css`) · Prisma + PostgreSQL · Auth.js v5 · next-intl (EN / አማርኛ) · Cloudinary (optional) · Leaflet/OSM.

The client's original logo is `public/brand/original/broker-sodo-logo.webp`; `npm run brand` regenerates every logo, favicon and share image from it. Colours and fonts come from `BrokerSodo-Brand-Kit`.

## Run locally

Requires Node 22 and PostgreSQL 14+ with the `pg_trgm` and `unaccent` extensions (included in standard installs).

```bash
npm install
cp .env.example .env          # fill DATABASE_URL, DIRECT_URL, AUTH_SECRET, SEED_ADMIN_*
npm run db:migrate            # prisma migrate deploy (incl. full-text search trigger)
npm run db:seed               # categories, areas, 46 sample listings, admin user
npm run dev                   # http://localhost:3000  — admin at /admin
```

Useful scripts: `npm run lint`, `npm run typecheck`, `npm run build`, `npm test` (unit), `npm run test:e2e` (Playwright, needs a built app + seeded DB), `npm run placeholders` (regenerate branded placeholder photos).

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Pooled Postgres connection (runtime) |
| `DIRECT_URL` | yes | Direct connection for migrations (same as above if no pooler) |
| `AUTH_SECRET` | yes | Auth.js secret (`npx auth secret`) |
| `NEXT_PUBLIC_SITE_URL` | yes | Public URL, no trailing slash (canonicals, sitemap, share links) |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` / `SEED_ADMIN_NAME` | for seeding | First admin account |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | production | Image storage/CDN. If empty, uploads go to `public/uploads` (dev only) |
| `NEXT_PUBLIC_CLOUDINARY_WATERMARK_ID` | optional | Public ID of the watermark overlay (upload `public/brand/logo-horizontal.png`) |

## Deploy (Vercel + Neon/Supabase)

1. Create a Postgres database (Neon or Supabase). Copy the pooled URL → `DATABASE_URL`, direct URL → `DIRECT_URL`.
2. Create a Cloudinary account; upload the white logo as the watermark and note its public ID.
3. Import the repo in Vercel and set all env vars above (`NEXT_PUBLIC_SITE_URL=https://brokersodo.com`).
4. Run migrations + seed once from your machine against production: `npm run db:migrate && npm run db:seed`
   (the seed wipes sample content tables — run it only on an empty DB; afterwards manage content in /admin).
   Optionally set Vercel's build command to `npx prisma migrate deploy && npm run build` so future migrations apply on deploy.
5. Deploy. Sign in at `/admin`, then in **Site settings** replace the placeholder phone / Telegram / WhatsApp, and in **Areas** replace the sample areas.

## Architecture notes

- `src/app/[locale]/(public)` public site · `src/app/(admin)/admin` staff CMS · `src/server/{queries,actions}` · `src/lib/{search,storage,validators,format,auth,…}`.
- Owner contact fields are never selected on public routes (`src/server/queries/selects.ts`). Every admin action re-checks auth + role on the server.
- Categories define their own fields (`attributeSchema`) via the visual schema builder — no migrations needed.
- Add Wolaita later: add `"wo"` to `src/i18n/routing.ts` and create `messages/wo.json`.
- Out of scope (not built): payments / paid featured listings, public accounts, Telegram bot, saved-search alerts.
