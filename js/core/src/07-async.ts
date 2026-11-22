/**
 * 07 - ASYNC & EVENT LOOP
 *
 * Node itu single-threaded untuk kode JS kita. Urutan eksekusi:
 *   1. kode synchronous sampai habis (call stack kosong)
 *   2. SEMUA microtask: process.nextTick dulu, lalu Promise callback (.then / setelah await)
 *   3. satu macrotask: timer (setTimeout), I/O, setImmediate ... lalu balik ke langkah 2
 *
 * Kalau dari Java: Spring MVC = thread per request, blocking itu "wajar".
 * Di Node, satu operasi CPU berat memblok SEMUA request. I/O harus async (Promise/await),
 * kerjaan CPU berat dipindah ke worker_threads. `Promise` ~ `CompletableFuture`, `AbortSignal` ~ cancel/timeout.
 */
import { setTimeout as delay } from 'node:timers/promises';

function scheduleAll(log: string[], done: (log: string[]) => void): void {
  log.push('sync 1');
  setTimeout(() => {
    log.push('timeout');
    done(log);
  }, 0);
  Promise.resolve().then(() => log.push('promise'));
  process.nextTick(() => log.push('nextTick'));
  queueMicrotask(() => log.push('microtask'));
  log.push('sync 2');
}

/** Urutan "textbook": dijalankan dari macrotask (call stack bersih). */
export const eventLoopOrder = () => new Promise<string[]>((resolve) => setImmediate(() => scheduleAll([], resolve)));

/**
 * GOTCHA: kalau kode yang sama dijalankan DARI DALAM microtask (misalnya setelah `await`,
 * atau top-level module ESM), antrian nextTick baru diproses setelah antrian promise habis.
 */
export const eventLoopOrderInsideMicrotask = () =>
  new Promise<string[]>((resolve) => queueMicrotask(() => scheduleAll([], resolve)));

/** sleep yang bisa dibatalkan lewat AbortSignal. */
export const sleep = (ms: number, signal?: AbortSignal) => delay(ms, undefined, { signal });

// --- callback -> promise ---
// Gaya lama Node: callback (err, result). util.promisify mengubahnya jadi Promise.
export function legacyRead(key: string, cb: (err: Error | null, value?: string) => void) {
  setImmediate(() => (key ? cb(null, `isi:${key}`) : cb(new Error('key kosong'))));
}

// --- sekuensial vs paralel ---
/** `await` di dalam loop = sekuensial. Sering jadi bug performa kalau tiap langkah independen. */
export async function sequential<T>(tasks: Array<() => Promise<T>>): Promise<T[]> {
  const out: T[] = [];
  for (const t of tasks) out.push(await t());
  return out;
}
export const parallel = <T>(tasks: Array<() => Promise<T>>) => Promise.all(tasks.map((t) => t()));

/** allSettled: nggak gagal total kalau ada satu yang reject. */
export async function settled<T>(tasks: Array<() => Promise<T>>) {
  const results = await Promise.allSettled(tasks.map((t) => t()));
  return {
    ok: results.filter((r) => r.status === 'fulfilled').map((r) => r.value),
    failed: results.filter((r) => r.status === 'rejected').length,
  };
}

/** Batasi konkurensi: maksimal `limit` task jalan bersamaan (pengganti thread pool). */
export async function mapLimit<T, R>(items: readonly T[], limit: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]!);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

// --- timeout & cancel pakai AbortSignal (standar web, juga dipakai fetch) ---
export async function withTimeout<T>(work: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  return work(AbortSignal.timeout(ms));
}

/** retry dengan backoff: contoh async + closure + higher-order function sekaligus. */
export async function retry<T>(fn: () => Promise<T>, { attempts = 3, baseMs = 10 } = {}): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < attempts - 1) await sleep(baseMs * 2 ** i);
    }
  }
  throw lastError;
}

// --- async iterator: stream data satu per satu (mis. baca baris file, paging API) ---
export async function* paginate(fetchPage: (page: number) => Promise<string[]>) {
  for (let page = 1; ; page++) {
    const items = await fetchPage(page);
    if (items.length === 0) return;
    yield* items;
  }
}
