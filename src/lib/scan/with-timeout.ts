import "server-only";

export class ScanPhaseTimeoutError extends Error {
  readonly phase: string;
  readonly timeoutMs: number;
  constructor(phase: string, timeoutMs: number) {
    super(`Scan phase "${phase}" exceeded ${timeoutMs}ms`);
    this.name = "ScanPhaseTimeoutError";
    this.phase = phase;
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Race a promise against a deadline so a hung GitHub fetch / image decode /
 * storage upload can't pin the function until Vercel's 300s ceiling.
 */
export function withTimeout<T>(
  task: Promise<T>,
  timeoutMs: number,
  phase: string,
): Promise<T> {
  let handle: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    handle = setTimeout(() => {
      reject(new ScanPhaseTimeoutError(phase, timeoutMs));
    }, timeoutMs);
  });
  return Promise.race([task, timeout]).finally(() => {
    if (handle) clearTimeout(handle);
  });
}
