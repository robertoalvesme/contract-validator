# syntax=docker/dockerfile:1

# ── Stage 1: install dependencies ────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
# Alterado: removido o "web/"
COPY package*.json ./
RUN npm ci --ignore-scripts

# ── Stage 2: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
# Alterado: copia todo o código da raiz atual para o diretório de trabalho
COPY . .

# Bundle skills data where the server utility can find it
RUN mkdir -p server/data
# Como default_skills.json também está na raiz, esta linha copia ele para a pasta final
COPY default_skills.json ./server/data/default_skills.json

RUN npm run build

# ── Stage 3: runtime (minimal image) ─────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
# Cloud Run injects PORT=8080; Nuxt/Nitro reads HOST and PORT
ENV HOST=0.0.0.0
ENV PORT=8080

COPY --from=builder /app/.output ./.output

EXPOSE 8080

CMD ["node", ".output/server/index.mjs"]