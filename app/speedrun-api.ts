const API = "https://www.speedrun.com/api/v1";
const RETRYABLE_STATUSES = new Set([408, 420, 425, 429, 500, 502, 503, 504]);
const DEFAULT_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 6_000;
const MIN_REQUEST_INTERVAL_MS = 750;
const RESPONSE_CACHE_FRESH_MS = 5 * 60 * 1_000;
const RESPONSE_CACHE_STALE_MS = 24 * 60 * 60 * 1_000;
const MAX_RESPONSE_CACHE_ENTRIES = 2_000;

type ResponseCacheEntry = {
  data: unknown;
  storedAt: number;
};

const responseCache = new Map<string, ResponseCacheEntry>();
let requestQueue = Promise.resolve();
let nextRequestAt = 0;

type SpeedrunRequestOptions = {
  allowNotFound?: boolean;
  attempts?: number;
  signal?: AbortSignal;
  userAgent: string;
};

export class SpeedrunApiError extends Error {
  status: number | null;
  rayId: string | null;

  constructor(message: string, status: number | null, rayId: string | null) {
    super(message);
    this.name = "SpeedrunApiError";
    this.status = status;
    this.rayId = rayId;
  }
}

function retryDelay(response: Response | null, attempt: number) {
  const retryAfter = response?.headers.get("Retry-After");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    const until = Date.parse(retryAfter) - Date.now();
    const requestedDelay = Number.isFinite(seconds) ? seconds * 1_000 : until;
    if (Number.isFinite(requestedDelay) && requestedDelay > 0) {
      return Math.min(requestedDelay, 2_000);
    }
  }

  if (response?.status === 420 || response?.status === 429) {
    return 5_000 * (attempt + 1);
  }

  return 250 * 2 ** attempt;
}

function wait(milliseconds: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
      return;
    }

    const onAbort = () => {
      clearTimeout(timeout);
      reject(signal?.reason ?? new DOMException("Aborted", "AbortError"));
    };
    const timeout = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, milliseconds);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

async function waitForRequestSlot(signal?: AbortSignal) {
  let release = () => undefined;
  const previous = requestQueue;
  requestQueue = new Promise<void>((resolve) => {
    release = resolve;
  });

  await previous;
  try {
    const delay = Math.max(0, nextRequestAt - Date.now());
    if (delay) await wait(delay, signal);
    nextRequestAt = Date.now() + MIN_REQUEST_INTERVAL_MS;
  } finally {
    release();
  }
}

function cacheResponse(path: string, data: unknown) {
  responseCache.delete(path);
  responseCache.set(path, { data, storedAt: Date.now() });

  if (responseCache.size > MAX_RESPONSE_CACHE_ENTRIES) {
    const oldestKey = responseCache.keys().next().value;
    if (oldestKey) responseCache.delete(oldestKey);
  }
}

function attemptSignal(parent?: AbortSignal) {
  const controller = new AbortController();
  const onAbort = () =>
    controller.abort(parent?.reason ?? new DOMException("Aborted", "AbortError"));
  parent?.addEventListener("abort", onAbort, { once: true });
  const timeout = setTimeout(
    () => controller.abort(new DOMException("Timed out", "TimeoutError")),
    REQUEST_TIMEOUT_MS,
  );

  return {
    signal: controller.signal,
    cleanup() {
      clearTimeout(timeout);
      parent?.removeEventListener("abort", onAbort);
    },
  };
}

export async function requestSpeedrunJson<T>(
  path: string,
  options: SpeedrunRequestOptions,
): Promise<T | null> {
  const cached = responseCache.get(path);
  if (cached && Date.now() - cached.storedAt < RESPONSE_CACHE_FRESH_MS) {
    return cached.data as T;
  }

  const attempts = Math.max(1, options.attempts ?? DEFAULT_ATTEMPTS);
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    await waitForRequestSlot(options.signal);
    const requestSignal = attemptSignal(options.signal);
    let response: Response | null = null;

    try {
      response = await fetch(`${API}${path}`, {
        cache: "default",
        headers: {
          Accept: "application/json",
          "User-Agent": options.userAgent,
        },
        signal: requestSignal.signal,
      });

      if (options.allowNotFound && response.status === 404) return null;
      if (response.ok) {
        const data = (await response.json()) as T;
        cacheResponse(path, data);
        return data;
      }

      const rayId = response.headers.get("CF-Ray");
      if (!RETRYABLE_STATUSES.has(response.status) || attempt === attempts - 1) {
        if (
          cached &&
          Date.now() - cached.storedAt < RESPONSE_CACHE_STALE_MS
        ) {
          console.warn(`Using stale speedrun.com data for ${path}`);
          return cached.data as T;
        }
        throw new SpeedrunApiError(
          `speedrun.com returned ${response.status} for ${path}`,
          response.status,
          rayId,
        );
      }

      await response.body?.cancel().catch(() => undefined);
    } catch (error) {
      if (options.signal?.aborted) throw error;
      if (error instanceof SpeedrunApiError) throw error;
      lastError = error;
      if (attempt === attempts - 1) {
        if (
          cached &&
          Date.now() - cached.storedAt < RESPONSE_CACHE_STALE_MS
        ) {
          console.warn(`Using stale speedrun.com data for ${path}`);
          return cached.data as T;
        }
        throw new SpeedrunApiError(
          `speedrun.com request failed for ${path}`,
          null,
          null,
        );
      }
    } finally {
      requestSignal.cleanup();
    }

    await wait(retryDelay(response, attempt), options.signal);
  }

  throw lastError;
}
