# =============================================================================
# LawGPT Frontend - Multi-stage Dockerfile
# Vite React build → Nginx static serving + reverse proxy
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Build the React app
# ---------------------------------------------------------------------------
FROM node:18-alpine AS builder

WORKDIR /build

# Copy package files first for layer caching
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --prefer-offline

# Copy source and build
COPY . .
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 2: Serve with Nginx
# ---------------------------------------------------------------------------
FROM nginx:1.25-alpine AS production

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static files from builder
COPY --from=builder /build/dist /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -qO- http://localhost/health-ping || exit 1

CMD ["nginx", "-g", "daemon off;"]
