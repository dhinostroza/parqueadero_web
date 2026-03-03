# ═══════════════════════════════════════════════════════════════════════════
# Parqueadero Frontend — Multi-stage build
# Stage 1: Build Vite app  ·  Stage 2: Serve with nginx
# ═══════════════════════════════════════════════════════════════════════════

# ── Stage 1: Build ────────────────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

# Accept Supabase env vars at build time (Vite inlines them)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

COPY package.json package-lock.json ./
RUN npm ci --production=false

COPY . .
RUN npm run build

# ── Stage 2: Serve ────────────────────────────────────────────────────────
FROM nginx:1.27-alpine

# Remove default nginx page
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx config for SPA routing
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
