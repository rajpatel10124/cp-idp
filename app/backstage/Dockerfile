# ForgeOps is a Backstage monolith: the backend serves the built frontend on 7007.
FROM node:20-bookworm-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json yarn.lock ./
COPY packages/app/package.json packages/app/package.json
COPY packages/backend/package.json packages/backend/package.json
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build:all

FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
RUN groupadd --gid 10001 forgeops && useradd --uid 10001 --gid forgeops --create-home forgeops
COPY --from=build --chown=forgeops:forgeops /app /app
USER forgeops
EXPOSE 7007
HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 CMD node -e "fetch('http://127.0.0.1:7007/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["yarn", "workspace", "backend", "start", "--config", "../../app-config.yaml", "--config", "../../app-config.production.yaml"]
