# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

# Copy dependency files first
COPY package.json package-lock.json* ./
RUN npm ci --silent || npm install --silent

# Copy source and build
COPY . .
RUN npm run build

# ─── Stage 2: Serve ───────────────────────────────────────────────────────────
FROM nginx:alpine

# Copy built assets from Stage 1
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
