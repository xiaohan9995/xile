# ─── Stage 1: Build admin frontend ──────────────────────────────────────────
FROM node:20-alpine AS admin-build

WORKDIR /build
COPY admin-src/package.json admin-src/package-lock.json ./
RUN npm ci --production=false
COPY admin-src/ .
RUN npm run build

# ─── Stage 2: Production image ─────────────────────────────────────────────
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends nginx && \
    rm -rf /var/lib/apt/lists/*

# Python deps
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Backend code
COPY backend/ .

# Admin static files
COPY --from=admin-build /build/dist/ /var/www/admin/

# Nginx config
COPY backend/nginx.conf /etc/nginx/sites-available/default

# Entrypoint
RUN chmod +x /app/start.sh

EXPOSE 80

CMD ["/app/start.sh"]
