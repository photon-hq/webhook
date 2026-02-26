FROM oven/bun:1 AS base

# ---
FROM base AS prepare
WORKDIR /app
RUN bun add -g turbo
COPY . .
RUN turbo prune @turbobun/web --docker

# ---
FROM base AS builder
WORKDIR /app

# First install the dependencies (as they change less often)
COPY --from=prepare /app/out/json/ .
RUN bun install

# Build the project
COPY --from=prepare /app/out/full/ .

# Uncomment and use build args to enable remote caching
# ARG TURBO_TEAM
# ENV TURBO_TEAM=$TURBO_TEAM

# ARG TURBO_TOKEN
# ENV TURBO_TOKEN=$TURBO_TOKEN

RUN bun run turbo build

# ---
FROM base AS runner
WORKDIR /app

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

CMD ["bun", "apps/web/server.js"]
