# syntax=docker/dockerfile:1

# ---- dependencies -----------------------------------------------------------
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---- build --------------------------------------------------------------------
FROM node:24-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 \
    BUILD_STANDALONE=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build && npm run build:scripts

# ---- runtime --------------------------------------------------------------------
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    MIGRATIONS_FOLDER=/app/drizzle

# Files stay owned by root and read-only for the app user.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/dist ./dist
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/content ./content

# Writable scratch space for Next's cache; mount an emptyDir here with a read-only root filesystem.
RUN mkdir -p .next/cache && chown node:node .next/cache

USER node
EXPOSE 3000

# `node dist/migrate.mjs` applies database migrations (run it before the server, e.g. as an init container).
CMD ["node", "server.js"]
