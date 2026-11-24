# Runtime env: DATABASE_URL (required, validated at startup).
# Behind a proxy set ORIGIN (e.g. https://app.example.com); if the proxy
# terminates TLS, PROTOCOL_HEADER / HOST_HEADER / PORT_HEADER can be set
# instead of ORIGIN (and ADDRESS_HEADER / XFF_DEPTH for client IPs). See @sveltejs/adapter-bun.
# Build needs no secrets: config is read lazily at runtime.

FROM oven/bun:1.4.4-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM deps AS build
COPY . .
RUN bun run build

FROM oven/bun:1.4.4-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json bun.lock ./
# --ignore-scripts: `prepare` (svelte-kit sync, lefthook) is dev-only and
# its tools are absent with --production.
RUN bun install --production --frozen-lockfile --ignore-scripts
COPY --from=build /app/build ./build
COPY drizzle ./drizzle
USER bun
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/healthz
CMD ["bun", "./build"]
