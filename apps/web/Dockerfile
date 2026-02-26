FROM oven/bun:1 AS build

WORKDIR /app

# Cache packages installation
COPY package.json package.json
COPY bun.lockb bun.lockb

COPY apps/web/package.json ./apps/web/package.json
COPY apps/api/package.json ./apps/api/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY packages/typescript-config/package.json ./packages/typescript-config/package.json

RUN bun install

COPY apps/web ./apps/web
COPY apps/api ./apps/api
COPY packages/db ./packages/db
COPY packages/typescript-config ./packages/typescript-config

ENV NODE_ENV=production

# Generate drizzle migrations
RUN cd packages/db && bun run db:generate

# Build the migrate script to plain JS so it runs without tsx/bun in the runner
RUN cd packages/db && bun build scripts/migrate.ts --outdir scripts --target node --external pg

RUN cd apps/web && bun run build

# ---
FROM node:24-alpine AS runner

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Leverage Next.js standalone output
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

# Copy drizzle migrations and migrate script
COPY --from=build --chown=nextjs:nodejs /app/packages/db/drizzle ./packages/db/drizzle
COPY --from=build --chown=nextjs:nodejs /app/packages/db/scripts/migrate.js ./packages/db/scripts/migrate.js
COPY --from=build --chown=nextjs:nodejs /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=build --chown=nextjs:nodejs /app/node_modules/pg ./node_modules/pg

USER nextjs

ENV NODE_ENV=production

EXPOSE 3000

CMD sh -c "node /app/packages/db/scripts/migrate.js || echo 'Migration failed, starting server anyway'; node apps/web/server.js"
