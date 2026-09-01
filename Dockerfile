syntax=docker/dockerfile:1

Stage 1: Deterministic Dependencies

FROM node:20-bookworm-slim AS deps

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --legacy-peer-deps --ignore-scripts

Stage 2: Next.js Standalone Builder

FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

Limit threads during build

ENV OPENBLAS_NUM_THREADS=1
ENV OMP_NUM_THREADS=1
ENV MKL_NUM_THREADS=1
ENV NUMEXPR_NUM_THREADS=1

RUN npm run build

Stage 3: Secure Production Runner

FROM node:20-bookworm-slim AS runner

WORKDIR /app

Install Python, LiteRT runtime and dependencies

RUN apt-get update && apt-get install -y --no-install-recommends 
python3 
python3-pip 
python3-venv 
&& ln -s /usr/bin/python3 /usr/bin/python || true 
&& rm -rf /var/lib/apt/lists/* 
&& pip3 install --no-cache-dir --break-system-packages 
numpy 
pillow 
ai-edge-litert 
tflite-runtime

Production environment

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

IMPORTANT: Limit OpenBLAS/NumPy threads in production

ENV OPENBLAS_NUM_THREADS=1
ENV OMP_NUM_THREADS=1
ENV MKL_NUM_THREADS=1
ENV NUMEXPR_NUM_THREADS=1

Create non-root dedicated security user

RUN groupadd --system --gid 1001 nodejs && 
useradd --system --uid 1001 nextjs

Copy runtime artifacts with correct ownership

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/src/static ./src/static
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

Native Node-based Container Healthcheck

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 
CMD node -e "require('http').get('http://127.0.0.1:3000/api/health', (r) => { if (r.statusCode !== 200) process.exit(1); }).on('error', () => process.exit(1))"

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
