import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

const CHUNK_RELOAD_KEY = 'zl-admin-chunk-reload';

/**
 * Detects Vite/React lazy-route failures caused by stale chunk hashes after deploy.
 */
export function isChunkLoadError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? `${error.name}: ${error.message}`
      : String(error ?? '');

  return (
    /Failed to fetch dynamically imported module/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /Loading chunk [\w-]+ failed/i.test(message) ||
    /ChunkLoadError/i.test(message)
  );
}

/**
 * Reloads the page once per session to pick up the new `index.html` chunk map.
 * Returns true when a reload was triggered.
 */
export function reloadOnceForStaleChunk(): boolean {
  try {
    if (sessionStorage.getItem(CHUNK_RELOAD_KEY) === '1') {
      sessionStorage.removeItem(CHUNK_RELOAD_KEY);
      return false;
    }
    sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
  } catch {
    // sessionStorage may be blocked; still attempt a single hard reload.
  }

  window.location.reload();
  return true;
}

function clearChunkReloadFlag(): void {
  try {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
  } catch {
    // ignore
  }
}

/**
 * `React.lazy` wrapper that hard-reloads once when a route chunk 404s after deploy.
 */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      const mod = await factory();
      clearChunkReloadFlag();
      return mod;
    } catch (error) {
      if (isChunkLoadError(error) && reloadOnceForStaleChunk()) {
        // Hold the suspense boundary open while the browser reloads.
        return new Promise(() => undefined);
      }
      throw error;
    }
  });
}
