// fetchRetry · Iter 24 · exponential backoff for transient errors.
// Use as drop-in replacement for fetch() · same signature.

const TRANSIENT = new Set([0, 408, 425, 429, 500, 502, 503, 504]);

export default async function fetchRetry(url, init = {}, opts = {}) {
  const {
    maxRetries = 3,
    baseDelay = 250,
    timeoutMs = 10_000,
    onRetry = null,
  } = opts;

  let attempt = 0;
  let lastErr = null;
  while (attempt <= maxRetries) {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: ctrl.signal });
      clearTimeout(tid);
      if (res.status === 0 || TRANSIENT.has(res.status)) {
        // Treat as retryable
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt);
          onRetry?.({ attempt, status: res.status, url, delay });
          await new Promise((r) => setTimeout(r, delay));
          attempt++;
          continue;
        }
      }
      return res;
    } catch (e) {
      clearTimeout(tid);
      lastErr = e;
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        onRetry?.({ attempt, error: e.message, url, delay });
        await new Promise((r) => setTimeout(r, delay));
        attempt++;
        continue;
      }
      throw e;
    }
  }
  throw lastErr || new Error(`fetchRetry exhausted ${maxRetries + 1} attempts`);
}

// JSON convenience
export async function fetchJSON(url, init = {}, opts = {}) {
  const res = await fetchRetry(url, init, opts);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText} · ${text.slice(0, 200)}`);
  }
  return res.json();
}
