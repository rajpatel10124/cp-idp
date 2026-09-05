# ==============================================================================
# Production Dockerfile for Background Worker Service
# ==============================================================================
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV WORKER_CONCURRENCY=${{ values.concurrency }}
ENV HEALTH_PORT=9090

COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
COPY src/ ./src/

USER node

EXPOSE 9090

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:9090/healthz || exit 1

CMD ["node", "src/worker.js"]
