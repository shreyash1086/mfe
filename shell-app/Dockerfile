# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

# Copy the shared design system folder first (required by the file:../shared-design-system dependency)
COPY shared-design-system /shared-design-system

# Copy dependency files for shell-app
COPY shell-app/package.json shell-app/package-lock.json* ./
RUN npm ci --silent || npm install --silent

# Copy sibling modules for Tailwind CSS content scanning
COPY module-assessment /module-assessment
COPY module-cloud-console /module-cloud-console
COPY module-cloud-labs /module-cloud-labs
COPY module-code-environment /module-code-environment
COPY module-code-module /module-code-module
COPY module-content-uploading /module-content-uploading
COPY module-dashboard /module-dashboard
COPY module-logging /module-logging
COPY module-virtual-machine /module-virtual-machine

# Copy source and build
COPY shell-app/ .
RUN npx webpack --config webpack.prod.config.js --mode production

# ─── Stage 2: Serve ───────────────────────────────────────────────────────────
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY shell-app/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
