# ---------- Base : Node + Chromium (Puppeteer / génération PDF) ----------
FROM node:22-bookworm-slim AS base
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium fonts-liberation fonts-dejavu-core ca-certificates \
    && rm -rf /var/lib/apt/lists/*
ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    APP_PORT=3000
EXPOSE 3000

# ---------- Dev : hot reload (code monté en volume, cf. docker-compose.dev.yml) ----------
FROM base AS dev
ENV NODE_ENV=development
CMD ["sh", "-c", "npm ci && npm run start:dev"]

# ---------- Build ----------
FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV PUPPETEER_SKIP_DOWNLOAD=true
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

# ---------- Runtime (cible par défaut) ----------
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
COPY --from=build /app/public ./public
# Gabarit du reçu/facture A4, lu à l'exécution via le chemin relatif src/templates/facture.html
COPY --from=build /app/src/templates ./src/templates
CMD ["node", "dist/main"]
