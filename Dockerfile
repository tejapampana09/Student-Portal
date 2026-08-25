# syntax=docker/dockerfile:1

# Stage 1: Fast Cached Dependencies
FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline --no-audit

# Stage 2: Fast Builder
FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# Stage 3: Ultra-Fast Production Runner
FROM python:3.11-slim-bookworm AS runner
WORKDIR /app

# Install Node.js 20 in runner
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && pip install --no-cache-dir numpy pillow tflite-runtime ai-edge-litert || true \
    && apt-get purge -y curl && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/src/static ./src/static
COPY --from=builder /app/scripts ./scripts

EXPOSE 3000
CMD ["node", "server.js"]
