# syntax=docker/dockerfile:1
# Build from the REPO ROOT:  docker build -f backend/Dockerfile .
# The API reads ../shared/default-content.json at runtime, so the image keeps the same folder layout as the repo:
#   /app/backend  (compiled code)    /app/shared  (default content)

# ---- build: compile TypeScript -------------------------------------------------------------
FROM node:26-alpine AS build
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN npm run build

# ---- runtime: production dependencies only ---------------------------------------------------
FROM node:26-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/backend/dist ./dist
COPY shared /app/shared

# Run as the unprivileged user that ships with the node image.
USER node
EXPOSE 4000
ENV PORT=4000

HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# `node` (not npm) as PID 1 so SIGTERM reaches the app and it can shut down cleanly.
CMD ["node", "dist/index.js"]
