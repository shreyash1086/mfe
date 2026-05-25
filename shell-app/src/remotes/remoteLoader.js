// Runtime Module Federation loader utilities
// Provides dynamic script injection, timeout, retry and safe container initialization.

export function loadScript(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    // Already loaded
    if ([...document.scripts].some((s) => s.src === url)) return resolve();

    const el = document.createElement("script");
    el.src = url;
    el.type = "text/javascript";
    el.async = true;

    const timer = setTimeout(() => {
      el.onerror = null;
      el.onload = null;
      reject(new Error(`Loading remote script timed out: ${url}`));
    }, timeout);

    el.onload = () => {
      clearTimeout(timer);
      resolve();
    };

    el.onerror = () => {
      clearTimeout(timer);
      reject(new Error(`Failed to load script ${url}`));
    };

    document.head.appendChild(el);
  });
}

// Initialize the container and return its exported module factory
export async function initRemoteContainer(scope) {
  if (!window[scope])
    throw new Error(`Remote scope ${scope} not found on window`);
  // Initialize the shared scope. This fills it if not already present.
  // eslint-disable-next-line no-undef
  await __webpack_init_sharing__("default");
  const container = window[scope];
  // Initialize the container to populate shared modules
  // eslint-disable-next-line no-undef
  if (!container.__initialized) {
    await container.init(__webpack_share_scopes__.default);
    container.__initialized = true;
  }
  return container;
}

export async function loadRemoteModule({
  remoteName,
  remoteUrl,
  exposedModule,
  timeout = 10000,
}) {
  // Load script if not present
  await loadScript(remoteUrl, timeout);
  const container = await initRemoteContainer(remoteName);
  if (!container.get)
    throw new Error(`Container ${remoteName} does not support .get()`);
  const factory = await container.get(exposedModule);
  const Module = factory();
  return Module;
}

// Helper that returns a React.lazy-compatible promise for a remote default export
export function loadRemoteComponent({
  remoteName,
  exposedModule,
  getRemoteUrl,
}) {
  const remoteUrl =
    typeof getRemoteUrl === "function"
      ? getRemoteUrl(remoteName)
      : getRemoteUrl;
  return ReactLazyWrapper(remoteName, remoteUrl, exposedModule);
}

function ReactLazyWrapper(remoteName, remoteUrl, exposedModule) {
  return () =>
    loadRemoteModule({ remoteName, remoteUrl, exposedModule })
      .then((mod) => ({ default: mod && mod.default ? mod.default : mod }))
      .catch((err) => {
        // Re-throw so React.Suspense/ErrorBoundary can catch
        throw err;
      });
}
