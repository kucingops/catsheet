/**
 * 02 - CLOSURE: cara JS bikin state privat
 *
 * Closure = function yang "mengingat" variabel dari scope tempat dia dibuat,
 * walaupun scope itu sudah selesai dieksekusi.
 *
 * Kalau dari Java: encapsulation biasanya = class + private field + getter.
 * Di JS, factory function + closure sudah memberi private BENERAN (nggak ada cara akses dari luar),
 * tanpa `class`, tanpa `this`, tanpa `new`. Method-nya juga aman dioper sebagai callback.
 */

export class InsufficientFundsError extends Error {
  override name = 'InsufficientFundsError';
}

// --- factory function: pengganti class BankAccount ---
export function createAccount(owner: string, initial = 0) {
  if (!owner.trim()) throw new Error('owner wajib diisi');
  if (initial < 0) throw new RangeError('setoran awal tidak boleh negatif');

  let balance = initial; // privat: cuma bisa disentuh lewat function di bawah
  const history: string[] = [];

  const assertPositive = (amount: number) => {
    if (!Number.isFinite(amount) || amount <= 0) throw new RangeError('nominal harus angka positif');
  };

  // Object yang dikembalikan = "public API". Di-freeze supaya method nggak bisa ditimpa dari luar.
  return Object.freeze({
    owner,
    get balance() {
      return balance;
    },
    history: () => [...history], // defensive copy
    deposit(amount: number) {
      assertPositive(amount);
      balance += amount;
      history.push(`deposit:${amount}`);
    },
    withdraw(amount: number) {
      assertPositive(amount);
      if (amount > balance) throw new InsufficientFundsError(`saldo ${balance}, mau tarik ${amount}`);
      balance -= amount;
      history.push(`withdraw:${amount}`);
    },
    toJSON: () => ({ owner, balance }),
  });
}
export type Account = ReturnType<typeof createAccount>;

// --- closure untuk utilitas sehari-hari ---

/** memoize: cache hasil function pure. Map-nya hidup di closure. */
export function memoize<A, R>(fn: (arg: A) => R): (arg: A) => R {
  const cache = new Map<A, R>();
  return (arg) => {
    if (!cache.has(arg)) cache.set(arg, fn(arg));
    return cache.get(arg)!;
  };
}

/** once: function cuma jalan sekali (misal init koneksi). */
export function once<R>(fn: () => R): () => R {
  let done = false;
  let result: R;
  return () => {
    if (!done) {
      result = fn();
      done = true;
    }
    return result;
  };
}

/** id generator: tiap generator punya counter sendiri. */
export function idGenerator(prefix: string) {
  let n = 0;
  return () => `${prefix}-${++n}`;
}

// --- gotcha klasik: closure di dalam loop ---
// `var` itu function-scoped: semua callback berbagi SATU variabel i (nilainya sudah 3 saat dipanggil).
// `let` itu block-scoped: tiap iterasi dapat binding baru.
export function loopWithVar(): number[] {
  const fns: Array<() => number> = [];
  for (var i = 0; i < 3; i++) fns.push(() => i);
  return fns.map((f) => f());
}
export function loopWithLet(): number[] {
  const fns: Array<() => number> = [];
  for (let i = 0; i < 3; i++) fns.push(() => i);
  return fns.map((f) => f());
}
