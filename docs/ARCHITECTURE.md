# Micro-Frontend Platform — Architecture Overview

This repository implements a production-grade micro-frontend platform using Webpack 5 Module Federation, Docker, and nginx. The goal is to keep each micro-frontend independently deployable while the `shell-app` composes remotes at runtime.

## What changed in this migration

- Runtime Module Federation loader that injects `remoteEntry.js` at runtime (no hardcoded build-time remote URLs).
- Centralized runtime remote config (`window.__RUNTIME_REMOTE_CONFIG__`) with sane localhost defaults; can be overridden at runtime (nginx or injected script).
- Shell now lazy-loads remotes using a robust loader with timeouts and retry support.
- Improved ModuleFederation `shared` config: `react`, `react-dom`, and `react-router-dom` are enforced as singletons with strict version matching.
- Dockerfiles improved (multi-stage builds retained, use `npm ci` when available). Shell Docker build uses explicit `webpack.prod.config.js`.
- Nginx configs include SPA routing, CORS headers for `remoteEntry.js` and caching policy for static assets.

## Runtime remote resolution strategy

- The shell reads `window.__RUNTIME_REMOTE_CONFIG__` to determine remote `remoteEntry.js` URLs.
- By default (dev), these point to `http://localhost:3001/remoteEntry.js`, etc.
- In Docker, you can inject a runtime override (example below) to point to service names or production URLs.

Example runtime override (nginx or entrypoint script):

<script>
  window.__RUNTIME_REMOTE_CONFIG__ = {
    auth: 'http://auth/remoteEntry.js',
    dashboard: 'http://dashboard/remoteEntry.js',
    profile: 'http://profile/remoteEntry.js',
  };
</script>

## How the shell loads remotes

1. On route navigation, the shell uses a `RemoteWrapper` which:
   - Uses `React.lazy()` with a runtime loader to fetch `remoteEntry.js`.
   - Calls the remote container `init()` to populate shared scopes.
   - Calls `container.get()` to read the exposed module and mount it.
   - Shows Suspense fallback while loading and an error boundary with a Retry button on failure.

## Running locally with Docker

Build and start everything with Docker Compose (services will be reachable on localhost):

```bash
docker-compose up --build
```

Service ports:

- Shell (host): http://localhost:3000
- Auth (remote): http://localhost:3001
- Dashboard (remote): http://localhost:3002
- Profile (remote): http://localhost:3003

## Next steps (recommended)

- Add runtime config injection during container start (entrypoint) that writes `window.__RUNTIME_REMOTE_CONFIG__` from environment variables.
- Add a shared package for design tokens, types, and utilities.
- Add CI workflows for independent image builds and publishing to registry.
- Add production-grade logging, error reporting, and health-check endpoints for remotes.

---

This document is a short summary of the changes performed so far. For a line-by-line walkthrough, or to continue implementing the remaining items (shared packages, runtime env injection, CI templates), tell me which task to pick next and I'll implement it.
