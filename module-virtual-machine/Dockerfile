# --- Stage 1: Build -----------------------------------------------------------
FROM node:18-alpine AS builder

WORKDIR /app

# Copy the shared design system folder first (required by the file:../shared-design-system dependency)
COPY shared-design-system /shared-design-system

# Copy dependency files for the specific module
COPY module-virtual-machine/package.json module-virtual-machine/package-lock.json* ./
RUN npm ci --silent || npm install --silent

# Copy module source and build
COPY module-virtual-machine/ .
RUN npm run build

# --- Stage 2: Serve -----------------------------------------------------------
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY module-virtual-machine/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
