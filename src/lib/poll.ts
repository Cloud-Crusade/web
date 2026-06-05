export interface PollOptions {
  maxAttempts?: number;
  intervalMs?: number;
  backoff?: boolean;
  maxIntervalMs?: number;
}

const DEFAULT_MAX_ATTEMPTS = 10;
const DEFAULT_INTERVAL_MS = 1_000;
const DEFAULT_MAX_INTERVAL_MS = 5_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** done(value) 가 true 가 될 때까지 fetcher 를 재시도. 타임아웃 시 throw. */
export async function pollUntil<T>(
  fetcher: () => Promise<T>,
  done: (value: T) => boolean,
  options: PollOptions = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const baseInterval = options.intervalMs ?? DEFAULT_INTERVAL_MS;
  const maxInterval = options.maxIntervalMs ?? DEFAULT_MAX_INTERVAL_MS;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const value = await fetcher();
    if (done(value)) {
      return value;
    }
    const delay = options.backoff
      ? Math.min(maxInterval, baseInterval * 2 ** attempt)
      : baseInterval;
    await sleep(delay);
  }
  throw new Error('polling timed out');
}
