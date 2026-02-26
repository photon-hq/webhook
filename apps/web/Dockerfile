FROM oven/bun:1 AS build

WORKDIR /app

# Cache packages installation
COPY package.json package.json
COPY bun.lockb bun.lockb

COPY apps/web/package.json ./apps/web/package.json
COPY packages/eden/package.json ./packages/eden/package.json
COPY packages/typescript-config/package.json ./packages/typescript-config/package.json

RUN bun install

COPY apps/web ./apps/web
COPY packages/eden ./packages/eden
COPY packages/typescript-config ./packages/typescript-config

ENV NODE_ENV=production

RUN cd apps/web && bun run build

# ---
FROM node:24-alpine AS runner

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

# Leverage Next.js standalone output
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

ENV NODE_ENV=production

CMD ["node", "apps/web/server.js"]

EXPOSE 3000
