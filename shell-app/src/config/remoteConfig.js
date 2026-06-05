/*
  remoteConfig.js
  Centralized runtime remote configuration strategy.
  - Reads window.__RUNTIME_REMOTE_CONFIG__ if provided (runtime override via nginx or injected script)
  - Falls back to sensible defaults for local development
*/

const DEFAULTS = {
  design_system: "http://localhost:3010/remoteEntry.js",
  cloud_labs: "http://localhost:3001/remoteEntry.js",
  dashboard: "http://localhost:3002/remoteEntry.js",
  virtual_machine: "http://localhost:3003/remoteEntry.js",
  cloud_console: "http://localhost:3004/remoteEntry.js",
  logging: "http://localhost:3005/remoteEntry.js",
  code_environment: "http://localhost:3006/remoteEntry.js",
  code_module: "http://localhost:3007/remoteEntry.js",
  content_uploading: "http://localhost:3008/remoteEntry.js",
  assessment: "http://localhost:3009/remoteEntry.js",
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
