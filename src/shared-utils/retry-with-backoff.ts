export type RetryOptions = {
  tries?: number;
  baseMs?: number;
};

type RetrySuccess<T> = { value: T; attempts: number };
type RetryFailure = { attempts: number; error: unknown };

export type RetryResult<T> = RetrySuccess<T> | RetryFailure;

const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<RetryResult<T>> => {
  const maxTries = Math.max(1, options.tries ?? 3);
  const baseMs = Math.max(1, options.baseMs ?? 200);
  let attempt = 0;
  let lastError: unknown;

  while (attempt < maxTries) {
    attempt += 1;
    try {
      const value = await fn();
      return { value, attempts: attempt };
    } catch (error) {
      lastError = error;
      if (attempt >= maxTries) {
        break;
      }
      await sleep(baseMs * attempt);
    }
  }

  return { attempts: attempt, error: lastError };
};
