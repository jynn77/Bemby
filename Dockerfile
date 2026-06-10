# ── Stage 1: Build frontend ────────────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Build backend + compile native addons + prune to prod deps ────────
FROM node:20-alpine AS backend-builder
WORKDIR /app
# python3/make/g++ required to compile better-sqlite3 native addon
RUN apk add --no-cache python3 make g++
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build && npm prune --omit=dev

# ── Stage 3: Production image ──────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

# Non-root user for security
RUN addgroup -S app && adduser -S app -G app

# Copy pruned node_modules (native addons already compiled — no build tools needed)
COPY --from=backend-builder --chown=app:app /app/node_modules ./node_modules
COPY --from=backend-builder --chown=app:app /app/dist        ./dist
COPY --from=backend-builder --chown=app:app /app/package.json ./package.json
COPY --from=frontend-builder --chown=app:app /frontend/dist  ./public

# Persistent data directory
RUN mkdir -p /app/data && chown app:app /app/data

USER app

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO /dev/null http://localhost:3000/ || exit 1

CMD ["node", "dist/server.js"]
