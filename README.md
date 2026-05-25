# Micro-Frontend Architecture
### React + Webpack Module Federation + Docker

A production-ready micro-frontend setup with 3 independent modules, each running in its own Docker container, orchestrated by a Shell host app.

---

## Architecture

```
micro-frontend/
├── shell-app/          ← Host (port 3000) — loads all modules at runtime
├── module-auth/        ← Auth module (port 3001) — Login / Register
├── module-dashboard/   ← Dashboard module (port 3002) — Stats / Charts
├── module-profile/     ← Profile module (port 3003) — User settings
└── docker-compose.yml  ← Master orchestrator
```

### How Modules Connect

```
Browser → http://localhost:3000 (Shell)
              │
              ├── fetches → http://localhost:3001/remoteEntry.js  (Auth)
              ├── fetches → http://localhost:3002/remoteEntry.js  (Dashboard)
              └── fetches → http://localhost:3003/remoteEntry.js  (Profile)
```

Each module **exposes** a React component via `remoteEntry.js`.
The Shell **loads** those components at runtime — not at build time.

---

## Quick Start

### Option A — Docker (Full Stack, Recommended)

```bash
# Build and start all 4 containers
docker-compose up --build

# Open browser
open http://localhost:3000
```

> Shell waits for all 3 modules to pass healthchecks before starting.

### Option B — Local Development (No Docker)

Run each module in a separate terminal:

```bash
# Terminal 1 — Auth module
cd module-auth && npm install && npm start
# → http://localhost:3001

# Terminal 2 — Dashboard module
cd module-dashboard && npm install && npm start
# → http://localhost:3002

# Terminal 3 — Profile module
cd module-profile && npm install && npm start
# → http://localhost:3003

# Terminal 4 — Shell (start last)
cd shell-app && npm install && npm start
# → http://localhost:3000
```

---

## How Module Federation Works

### 1. Each module EXPOSES itself

```js
// module-auth/webpack.config.js
new ModuleFederationPlugin({
  name: "auth",
  filename: "remoteEntry.js",   // manifest file
  exposes: {
    "./AuthApp": "./src/App",   // what the world can import
  },
  shared: { react: { singleton: true } },
})
```

### 2. Shell CONSUMES them

```js
// shell-app/webpack.config.js
new ModuleFederationPlugin({
  name: "shell",
  remotes: {
    auth:      "auth@http://localhost:3001/remoteEntry.js",
    dashboard: "dashboard@http://localhost:3002/remoteEntry.js",
    profile:   "profile@http://localhost:3003/remoteEntry.js",
  },
  shared: { react: { singleton: true } },
})
```

### 3. Shell imports modules like normal React

```jsx
// Loaded at RUNTIME, not build time
const AuthApp = lazy(() => import("auth/AuthApp"));
const Dashboard = lazy(() => import("dashboard/DashboardApp"));
```

### 4. `shared: { react: { singleton: true } }`

This is critical. Without it, each module loads its own React instance — 4 copies total.
With `singleton: true`, all modules share ONE React instance negotiated at runtime.

---

## Docker Details

### Each module's Dockerfile (multi-stage)

```dockerfile
# Stage 1: Build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install        # cached unless package.json changes
COPY . .
RUN npm run build      # outputs to /app/dist

# Stage 2: Serve (tiny nginx image)
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### nginx.conf key settings

```nginx
# remoteEntry.js must NEVER be cached
location = /remoteEntry.js {
    add_header Cache-Control "no-store, no-cache, must-revalidate";
}

# CORS required for cross-origin module loading
add_header 'Access-Control-Allow-Origin' '*' always;
```

### docker-compose.yml key settings

```yaml
shell:
  depends_on:
    auth:      { condition: service_healthy }   # waits for healthcheck
    dashboard: { condition: service_healthy }
    profile:   { condition: service_healthy }
```

---

## Scaling in Production

### Scale a single module

```bash
# Scale dashboard to 3 instances (behind a load balancer)
docker-compose up --scale dashboard=3 -d
```

### Deploy only one module (zero-downtime)

```bash
# Rebuild and restart only auth, without touching others
docker-compose up --build --no-deps auth
```

### Environment-specific remotes

Create `.env.production`:
```env
AUTH_URL=https://auth.myapp.com
DASHBOARD_URL=https://dashboard.myapp.com
PROFILE_URL=https://profile.myapp.com
```

Update `webpack.prod.config.js` to use `process.env.*`.

---

## Module Independence

Each module can:
- ✅ Be developed by a separate team
- ✅ Run standalone (open `:3001` directly in browser)
- ✅ Have its own CI/CD pipeline
- ✅ Deploy independently without redeploying others
- ✅ Use a different version of shared libraries (with care)

---

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| Shell shows "Module Unavailable" | Remote container not running | Start the module container |
| Blank page with no errors | Missing async boundary | Ensure `index.js` only does `import("./bootstrap")` |
| React hook errors | Two React instances | Verify `singleton: true` in all shared configs |
| CORS error fetching remoteEntry.js | Missing headers | Check nginx.conf has `Access-Control-Allow-Origin` |
| remoteEntry.js 404 | Module not built | Run `npm run build` in the module |

---

## Project Structure (each module)

```
module-auth/
├── src/
│   ├── index.js          ← Entry (just: import("./bootstrap"))
│   ├── bootstrap.js      ← Mounts React (async boundary)
│   ├── App.jsx           ← Component exposed to Shell
│   └── styles.css
├── public/
│   └── index.html
├── webpack.config.js     ← Module Federation config (exposes AuthApp)
├── .babelrc
├── Dockerfile
├── nginx.conf
└── package.json
```
