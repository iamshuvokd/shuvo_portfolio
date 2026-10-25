# syntax=docker/dockerfile:1
# Build from the REPO ROOT:  docker build -f frontend/Dockerfile .
# Output is a static site served by nginx; the gateway (Caddy) routes /api to the backend.

# ---- build ---------------------------------------------------------------------------------
FROM node:26-alpine AS build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY shared /app/shared
COPY frontend ./

# Build-time settings are baked into the JavaScript (they are public values, never secrets).
#   VITE_API_URL  '/api' = same origin through the gateway. Empty would ship a site with no admin.
#   SITE_URL      absolute public address, used for the social-preview (og:image) tags.
ARG VITE_API_URL=/api
ARG SITE_URL=
ENV VITE_API_URL=$VITE_API_URL SITE_URL=$SITE_URL
RUN npm run build && npm run check:size

# ---- serve ---------------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime
COPY frontend/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY frontend/nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=3s --retries=5 CMD wget -q --spider http://127.0.0.1/healthz || exit 1
