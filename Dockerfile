# syntax=docker/dockerfile:1

# Stage 1: Dependencies (cached unless package.json changes)
FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

# Stage 2: Builder (only re-runs npm run build when src changes)
FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json* ./
# Copy config files first (change less often = better cache)
COPY next.config.ts tsconfig.json tailwind.config.* postcss.config.* ./
COPY public ./public
# Copy source last (changes most often)
COPY src ./src
COPY scripts ./scripts
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=1536"
RUN npm run build

# Stage 3: Production Runner
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Python runtime for captcha solver (cached - rarely changes)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip python3-venv \
    && rm -rf /var/lib/apt/lists/* \
    && ln -s /usr/bin/python3 /usr/bin/python
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir numpy pillow tflite-runtime ai-edge-litert || true

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/src ./src
COPY --from=builder /app/scripts ./scripts

EXPOSE 3000
CMD ["npm", "start"]
