# syntax=docker/dockerfile:1
#
# Build context must be the PROJECT ROOT (parent of web/):
#   docker build -f web/Dockerfile -t contract-finder .
#
# This allows COPY to access both web/ and default_skills.json.

# ── Stage 1: install dependencies ────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts

# ── Stage 2: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY web/ .

# Bundle skills data where the server utility can find it
RUN mkdir -p server/data
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
