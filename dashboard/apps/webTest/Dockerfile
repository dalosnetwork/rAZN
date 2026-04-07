FROM node:22-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

FROM base AS builder
WORKDIR /app

COPY . .

RUN pnpm install --frozen-lockfile

ENV NEXT_TELEMETRY_DISABLED=1

# Build from app dir so Next uses apps/webTest/next.config.mjs. Use webpack (not Turbopack)
# so standalone output includes all SSR chunks and avoids ChunkLoadError in Docker.
# If you still see [turbopack]_runtime.js errors, rebuild with: docker compose build --no-cache web
WORKDIR /app/apps/webTest
RUN rm -rf .next && pnpm run build:docker

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/webTest/.next/standalone ./
COPY --from=builder /app/apps/webTest/.next/static ./apps/webTest/.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "apps/webTest/server.js"]
