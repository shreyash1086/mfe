/*
  remoteConfig.js
  Centralized runtime remote configuration strategy.
  - Reads window.__RUNTIME_REMOTE_CONFIG__ if provided (runtime override via nginx or injected script)
  - Falls back to sensible defaults for local development
*/

const DEFAULTS = {
  auth: "http://localhost:3001/remoteEntry.js",
  dashboard: "http://localhost:3002/remoteEntry.js",
  profile: "http://localhost:3003/remoteEntry.js",
};

export function getRuntimeRemoteConfig() {
  if (typeof window !== "undefined" && window.__RUNTIME_REMOTE_CONFIG__) {
    return { ...DEFAULTS, ...window.__RUNTIME_REMOTE_CONFIG__ };
  }
  return DEFAULTS;
}

export function getRemoteUrl(name) {
  const cfg = getRuntimeRemoteConfig();
  return cfg[name];
}

export default { getRuntimeRemoteConfig, getRemoteUrl };
