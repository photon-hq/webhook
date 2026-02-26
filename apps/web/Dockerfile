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

RUN cd apps/web && bun run build

# ---
FROM node:24-alpine AS runner

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Install drizzle-kit for running migrations at startup
RUN npm install -g drizzle-kit pg dotenv

# Leverage Next.js standalone output
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

# Copy drizzle migrations and config for runtime migration
COPY --from=build --chown=nextjs:nodejs /app/packages/db/drizzle ./packages/db/drizzle
COPY --from=build --chown=nextjs:nodejs /app/packages/db/drizzle.config.ts ./packages/db/drizzle.config.ts

USER nextjs

ENV NODE_ENV=production

EXPOSE 3000

CMD sh -c "cd packages/db && drizzle-kit migrate && cd /app && node apps/web/server.js"
