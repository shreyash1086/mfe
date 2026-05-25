# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

# Copy dependency files first (layer caching — npm install only re-runs if these change)
COPY package.json ./
RUN npm install

# Copy source and build
COPY . .
# Use production webpack config (explicit)
RUN npx webpack --config webpack.prod.config.js --mode production

# ─── Stage 2: Serve ───────────────────────────────────────────────────────────
# Tiny nginx image — only the built static assets, no Node.js runtime needed
FROM nginx:alpine

# Copy built assets from Stage 1
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config (handles SPA routing + CORS for Module Federation)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
