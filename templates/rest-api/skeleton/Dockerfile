# ==============================================================================
# Production-ready Multi-Stage Dockerfile for REST API
# ==============================================================================
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev

FROM node:20-alpine AS runner
WORKDIR /app

# Security: Create non-privileged service user
ENV NODE_ENV=production
ENV PORT=${{ values.port }}

COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
COPY src/ ./src/

USER node

EXPOSE ${{ values.port }}

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${{ values.port }}/healthz || exit 1

CMD ["node", "src/index.js"]
