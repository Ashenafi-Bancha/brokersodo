# BrokerSodo production image for AletCloud App Hosting (or any Docker host).
FROM node:22-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund
COPY . .
# The build does not connect to the database. These values only satisfy Prisma and Auth.js.
ENV DOCKER_BUILD=1 \
    DATABASE_URL=postgresql://build:build@localhost:5432/build \
    AUTH_SECRET=build-time-only \
    NEXT_PUBLIC_SITE_URL=https://brokersodo.com \
    NODE_OPTIONS=--max-old-space-size=600
RUN npx prisma generate && npx next build && node scripts/lower-browser-js.mjs
# One-file copy of the launch setup (admin, categories, areas, pages). Runs at start-up when SEED_ADMIN_* are set.
RUN npx esbuild prisma/seed.ts --bundle --platform=node --target=node22 --format=cjs --external:@prisma/client --outfile=launch-seed.cjs

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOME=/tmp
RUN npm install --prefix /opt/prisma --omit=dev --no-audit --no-fund prisma@6.19.3 \
  && chown -R node:node /opt/prisma
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --from=builder --chown=node:node /app/docker-entrypoint.sh ./docker-entrypoint.sh
COPY --from=builder --chown=node:node /app/launch-seed.cjs ./launch-seed.cjs
USER node
EXPOSE 3000
CMD ["sh", "/app/docker-entrypoint.sh"]
