# syntax=docker/dockerfile:1

# ── Stage 1: install dependencies ────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts

# ── Stage 2: build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Bundle seed data where the server utility can find it at runtime
RUN mkdir -p server/data
COPY default_skills.json ./server/data/default_skills.json
COPY default_contracts.json ./server/data/default_contracts.json

RUN npm run build

# ── Stage 3: runtime (minimal image) ─────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
# Cloud Run injects PORT=8080; Nuxt/Nitro reads HOST and PORT
ENV HOST=0.0.0.0
ENV PORT=8080
# Allow TLS 1.0/1.1 — needed for legacy corporate servers (Avaya portal)
ENV NODE_OPTIONS=--tls-min-v1.0

# Lower the system OpenSSL minimum so Node's TLS binding can honour --tls-min-v1.0.
# Alpine's OpenSSL 3 defaults to MinProtocol=TLSv1.2; this relaxes it.
RUN sed -i \
      -e 's/MinProtocol *= *TLSv1\.2/MinProtocol = TLSv1/g' \
      -e 's/CipherString *= *DEFAULT@SECLEVEL=2/CipherString = DEFAULT@SECLEVEL=0/g' \
      /etc/ssl/openssl.cnf 2>/dev/null || true

COPY --from=builder /app/.output ./.output
# 👇 ESTA É A LINHA NOVA QUE FALTAVA 👇
COPY --from=builder /app/server ./server

EXPOSE 8080

CMD ["node", ".output/server/index.mjs"]