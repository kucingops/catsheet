/**
 * 01 - FUNCTION ADALAH NILAI (first-class function)
 *
 * Di JS, function itu value biasa: bisa disimpan di variabel, dioper sebagai argumen,
 * dan dikembalikan dari function lain. Ini fondasi hampir semua pola di file berikutnya.
 *
 * Kalau dari Java: kebayang `Function<T,R>` / lambda, tapi tanpa interface functional,
 * tanpa class pembungkus. Nggak perlu `StringUtils` berisi static method: cukup export function.
 */

// --- deklarasi vs expression vs arrow ---
// function declaration di-hoist (bisa dipanggil sebelum baris deklarasinya).
export function add(a: number, b: number): number {
  return a + b;
}
// arrow function: ringkas, dan TIDAK punya `this` sendiri (lihat 04).
export const multiply = (a: number, b: number): number => a * b;

// --- default param, rest param, destructuring param ---
// Pengganti method overloading + builder: satu function, "options object" dengan default.
export interface GreetOptions {
  greeting?: string;
  shout?: boolean;
}
export function greet(name: string, { greeting = 'Halo', shout = false }: GreetOptions = {}): string {
  const text = `${greeting}, ${name}`;
  return shout ? text.toUpperCase() : text;
}

export const sum = (...nums: number[]): number => nums.reduce(add, 0);

// --- higher-order function: menerima / mengembalikan function ---
export const twice =
  <T>(fn: (x: T) => T) =>
  (x: T): T =>
    fn(fn(x));

// currying / partial application: "konfigurasi" di depan, data di belakang.
export const percentOf = (rate: number) => (amount: number) => amount * rate;
export const tax11 = percentOf(0.11); // function siap pakai, mirip factory tapi tanpa class

// compose kanan-ke-kiri, pipe kiri-ke-kanan. Dipakai lagi di 05-functional.
export const pipe =
  <T>(...fns: Array<(x: T) => T>) =>
  (x: T): T =>
    fns.reduce((acc, fn) => fn(acc), x);

// --- pure vs impure ---
// Pure: output cuma tergantung input, tanpa efek samping. Gampang di-test, aman di-cache.
export const applyDiscount = (price: number, pct: number): number => price - price * pct;

// Impure: tergantung waktu sekarang. Solusinya bukan Clock interface, cukup terima `now` sebagai parameter
// (dengan default), jadi test tinggal oper tanggal.
export function partOfDay(now: Date = new Date()): 'pagi' | 'siang' | 'sore' | 'malam' {
  const h = now.getUTCHours();
  return h < 11 ? 'pagi' : h < 15 ? 'siang' : h < 18 ? 'sore' : 'malam';
}

// --- function juga object: bisa punya property ---
export function counted<A extends unknown[], R>(fn: (...args: A) => R) {
  const wrapper = (...args: A): R => {
    wrapper.calls++;
    return fn(...args);
  };
  wrapper.calls = 0;
  return wrapper;
}
