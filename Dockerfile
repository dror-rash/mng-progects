# One Dockerfile for every zone:
#   docker build --build-arg APP=shell --build-arg EXAMPLE_ZONE_URL=https://... -t shell .
#   docker build --build-arg APP=example-zone -t example-zone .
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

# 1) Prune the monorepo down to just this app and its workspace dependencies
FROM base AS pruner
ARG APP
COPY . .
RUN pnpm dlx turbo@^2 prune @repo/${APP} --docker

# 2) Install (cached unless lockfile/package.json change) and build
FROM base AS builder
ARG APP
ARG EXAMPLE_ZONE_URL
ENV EXAMPLE_ZONE_URL=${EXAMPLE_ZONE_URL} \
    NEXT_TELEMETRY_DISABLED=1 \
    TURBO_TELEMETRY_DISABLED=1
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
RUN pnpm turbo run build --filter=@repo/${APP}

# 3) Minimal runtime image (Next standalone output)
FROM node:22-alpine AS runner
ARG APP
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=8080 \
    HOSTNAME=0.0.0.0 \
    APP=${APP}
WORKDIR /app
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=builder --chown=nextjs:nodejs /app/apps/${APP}/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/${APP}/.next/static ./apps/${APP}/.next/static
# If you add apps/<zone>/public, also: COPY --from=builder ... /app/apps/${APP}/public ./apps/${APP}/public
USER nextjs
EXPOSE 8080
CMD ["sh", "-c", "node apps/${APP}/server.js"]
