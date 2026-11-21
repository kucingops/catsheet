/**
 * 09 - ASYNC, EVENT LOOP & CLOSURE (sering keluar di interview JS walau posisinya backend)
 *
 * Node itu single-threaded untuk kode JS kita. Urutan eksekusi:
 *   1. kode synchronous sampai habis (call stack kosong)
 *   2. SEMUA microtask: process.nextTick dulu, lalu Promise callback (.then / setelah await)
 *   3. satu macrotask: timer (setTimeout), I/O, setImmediate ... lalu balik ke langkah 2
 * Beda dengan Spring MVC (thread-per-request): di Node, satu operasi CPU berat memblok SEMUA request.
 * Solusinya: worker_threads, atau pecah kerjaan.
 */

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
export function eventLoopOrder(): Promise<string[]> {
  return new Promise((resolve) => setImmediate(() => scheduleAll([], resolve)));
}

/**
 * GOTCHA: kalau kode yang sama dijalankan DARI DALAM microtask (misalnya setelah `await`,
 * atau top-level module ESM), antrian nextTick baru diproses setelah antrian promise habis.
 * Jadi `nextTick` keluar paling akhir di antara microtask.
 */
export function eventLoopOrderInsideMicrotask(): Promise<string[]> {
  return new Promise((resolve) => queueMicrotask(() => scheduleAll([], resolve)));
}

/** Closure: function "mengingat" variabel dari scope tempat dia dibuat. Dipakai buat private state tanpa class. */
export function createCounter(start = 0) {
  let value = start; // tidak bisa diakses dari luar kecuali lewat function di bawah
  return {
    inc: () => ++value,
    get: () => value,
  };
}

/** Paralel vs sekuensial. `await` di dalam loop = sekuensial (sering jadi bug performa). */
export async function fetchAllParallel<T>(tasks: Array<() => Promise<T>>): Promise<T[]> {
  return Promise.all(tasks.map((t) => t()));
}

/** allSettled: nggak gagal total kalau ada satu yang reject. */
export async function fetchAllSettled<T>(tasks: Array<() => Promise<T>>) {
  const results = await Promise.allSettled(tasks.map((t) => t()));
  return {
    ok: results.filter((r) => r.status === 'fulfilled').map((r) => r.value),
    failed: results.filter((r) => r.status === 'rejected').length,
  };
}

/** Timeout untuk promise apa pun, pakai AbortSignal.timeout bawaan Node. */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const signal = AbortSignal.timeout(ms);
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => signal.addEventListener('abort', () => reject(signal.reason))),
  ]);
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
