// In-memory TTL cache. Two consumers:
//  1. cacheMiddleware(ttlSeconds) — caches whole route responses by URL.
//  2. withCache(key, ttlMs, fn)   — wraps external API calls in services,
//     serving stale data (stale: true) when the upstream call fails.

class TTLCache {
  constructor() {
    this.store = new Map();
  }

  set(key, value, ttlMs) {
    this.store.set(key, { value, expires: Date.now() + ttlMs });
  }

  /** Returns the value only if it has not expired. */
  get(key) {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expires) return undefined;
    return entry.value;
  }

  /** Returns the value even if expired — used for stale fallbacks. */
  getStale(key) {
    return this.store.get(key)?.value;
  }

  delete(key) {
    this.store.delete(key);
  }

  /** Delete every key that starts with the given prefix. */
  invalidatePrefix(prefix) {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

  /** Evict expired entries; called periodically from the scheduler. */
  sweep() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      // Keep stale entries for one hour past expiry as a fallback buffer.
      if (now > entry.expires + 60 * 60 * 1000) this.store.delete(key);
    }
  }
}

export const cache = new TTLCache();

/**
 * Route-level response cache. Only successful JSON responses are cached.
 */
export function cacheMiddleware(ttlSeconds) {
  return (req, res, next) => {
    if (req.method !== 'GET') return next();
    const key = `route:${req.originalUrl}`;
    const hit = cache.get(key);
    if (hit !== undefined) {
      res.set('X-Cache', 'HIT');
      return res.json(hit);
    }
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode === 200 && body && body.success) {
        cache.set(key, body, ttlSeconds * 1000);
      }
      return originalJson(body);
    };
    next();
  };
}

/**
 * Wrap an async producer with TTL caching + stale-on-error fallback.
 * Returns { data, stale } — `stale` is true when the fresh call failed
 * and an expired cached value was served instead.
 */
export async function withCache(key, ttlMs, producer) {
  const fresh = cache.get(key);
  if (fresh !== undefined) return { data: fresh, stale: false };

  try {
    const data = await producer();
    cache.set(key, data, ttlMs);
    return { data, stale: false };
  } catch (err) {
    const stale = cache.getStale(key);
    if (stale !== undefined) {
      console.warn(`[cache] serving stale data for "${key}":`, err.message);
      return { data: stale, stale: true };
    }
    throw err;
  }
}
