FROM node:20-slim AS builder

RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/frontend/package.json ./packages/frontend/

RUN pnpm install --frozen-lockfile

COPY packages/shared/ ./packages/shared/
COPY packages/frontend/ ./packages/frontend/

RUN pnpm --filter frontend build


FROM nginx:alpine

COPY --from=builder /app/packages/frontend/dist /usr/share/nginx/html
COPY packages/frontend/nginx.conf /etc/nginx/templates/default.conf.template
COPY packages/frontend/docker-entrypoint.sh /docker-entrypoint.d/10-env-config.sh
RUN chmod +x /docker-entrypoint.d/10-env-config.sh

EXPOSE 80
