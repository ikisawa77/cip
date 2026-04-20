export type RouteChunkKey =
  | "auth-dialog"
  | "category-page"
  | "product-page"
  | "topup-page"
  | "account-page"
  | "admin-page";

const routeChunkLoaders = {
  "auth-dialog": () => import("../components/AuthDialog"),
  "category-page": () => import("../pages/CategoryPage"),
  "product-page": () => import("../pages/ProductPage"),
  "topup-page": () => import("../pages/TopupPage"),
  "account-page": () => import("../pages/AccountPage"),
  "admin-page": () => import("../pages/AdminPage")
} satisfies Record<RouteChunkKey, () => Promise<unknown>>;

const routeChunkCache = new Map<RouteChunkKey, Promise<unknown>>();

export function preloadRouteChunk(key: RouteChunkKey) {
  const cached = routeChunkCache.get(key);
  if (cached) {
    return cached;
  }

  const promise = routeChunkLoaders[key]();
  routeChunkCache.set(key, promise);
  return promise;
}

export function scheduleRouteChunkPrefetch(keys: RouteChunkKey[], timeout = 900) {
  if (typeof window === "undefined") {
    return;
  }

  const run = () => {
    for (const key of keys) {
      void preloadRouteChunk(key);
    }
  };

  const idleWindow = window as Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  };

  if (typeof idleWindow.requestIdleCallback === "function") {
    idleWindow.requestIdleCallback(run, { timeout });
    return;
  }

  window.setTimeout(run, 250);
}

export function prefetchRouteForPath(path: string) {
  if (path.startsWith("/category/")) {
    void preloadRouteChunk("category-page");
    return;
  }

  if (path.startsWith("/product/")) {
    void preloadRouteChunk("product-page");
    return;
  }

  if (path.startsWith("/topup")) {
    void preloadRouteChunk("topup-page");
    return;
  }

  if (path.startsWith("/account")) {
    void preloadRouteChunk("account-page");
    return;
  }

  if (path.startsWith("/admin")) {
    void preloadRouteChunk("admin-page");
  }
}
