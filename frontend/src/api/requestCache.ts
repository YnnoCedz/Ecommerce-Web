const inFlightRequests = new Map<string, { promise: Promise<unknown>; controller: AbortController }>();
const responseCache = new Map<string, { expiresAt: number; value: unknown }>();

export function getCachedResponse<T>(key: string): T | undefined {
  const cached = responseCache.get(key);

  if (!cached) return undefined;
  if (cached.expiresAt <= Date.now()) {
    responseCache.delete(key);
    return undefined;
  }

  return cached.value as T;
}

export function singleFlight<T>(key: string, factory: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const existing = inFlightRequests.get(key);
  if (existing) {
    return existing.promise as Promise<T>;
  }

  const controller = new AbortController();
  const request = factory(controller.signal).finally(() => {
    inFlightRequests.delete(key);
  });

  inFlightRequests.set(key, { promise: request, controller });
  return request;
}

export function cachedSingleFlight<T>(key: string, ttlMs: number, factory: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const cached = getCachedResponse<T>(key);
  if (cached !== undefined) return Promise.resolve(cached);

  return singleFlight(key, async (signal) => {
    const value = await factory(signal);
    responseCache.set(key, { expiresAt: Date.now() + ttlMs, value });
    return value;
  });
}

export function cancelInFlight(prefixes: string[]): void {
  for (const [key, request] of inFlightRequests) {
    if (prefixes.some((prefix) => key.startsWith(prefix))) {
      request.controller.abort();
      inFlightRequests.delete(key);
    }
  }
}
