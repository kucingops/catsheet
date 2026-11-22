/**
 * 09 - KAPAN `class` MEMANG PILIHAN YANG IDIOMATIS DI JS
 *
 * Gaya JS bukan "anti-class". Class dipakai kalau memang cocok:
 *  1. Custom Error   -> `extends Error` itu standar. `instanceof` + `name` dipakai buat handling.
 *  2. Banyak instance dengan perilaku sama + identitas -> method di prototype dibagi bersama (hemat memori),
 *     `#private` buat state. Contoh: struktur data (LRU cache), entity domain.
 *  3. Extend built-in / API platform: `EventTarget`, `Error`, `Map`, `Transform` stream, Web Component.
 *  4. Framework yang memang berbasis class + decorator: NestJS, TypeORM, Angular (lihat ../nestjs).
 *
 * Yang JARANG idiomatis di JS (tapi lumrah di Java):
 *  - class yang isinya cuma static method (-> export function)
 *  - class stateless dengan satu method (-> function)
 *  - hierarki inheritance dalam (-> composition, lihat 06)
 *  - getter/setter untuk setiap field (-> plain object / readonly)
 *  - interface + class Impl untuk tiap service (-> factory function + tipe)
 *
 * Kalau dari Java, cheatsheet singkat:
 *  - `private` Java  = `#field` (dijaga runtime). Keyword `private` TS cuma dicek compiler.
 *  - `final` field   = `readonly`.   `@Override` = `override` (+ `noImplicitOverride`).
 *  - `interface` TS HILANG saat runtime: nggak bisa `instanceof`, nggak bisa jadi token DI.
 *  - `super()` wajib sebelum akses `this` di constructor subclass.
 */

// ---------- 1. Custom error hierarchy ----------
export class DomainError extends Error {
  override name = 'DomainError';
  readonly code: string;
  constructor(code: string, message: string, options?: ErrorOptions) {
    super(message, options); // options.cause: chaining error, mirip `new RuntimeException(msg, cause)`
    this.code = code;
  }
}
export class NotFoundError extends DomainError {
  override name = 'NotFoundError';
  constructor(what: string, id: string) {
    super('NOT_FOUND', `${what} ${id} tidak ditemukan`);
  }
}
export function toHttpStatus(err: unknown): number {
  if (err instanceof NotFoundError) return 404;
  if (err instanceof DomainError) return 422;
  return 500;
}

// ---------- 2. Struktur data dengan state privat & banyak instance ----------
/** LRU cache: memanfaatkan urutan insert Map. Class cocok karena ada state + invariant + banyak instance. */
export class LruCache<K, V> {
  readonly #max: number;
  readonly #map = new Map<K, V>();

  constructor(max: number) {
    if (max < 1) throw new RangeError('max minimal 1');
    this.#max = max;
  }

  get(key: K): V | undefined {
    if (!this.#map.has(key)) return undefined;
    const value = this.#map.get(key)!;
    this.#map.delete(key); // pindah ke posisi "paling baru"
    this.#map.set(key, value);
    return value;
  }

  set(key: K, value: V): this {
    this.#map.delete(key);
    this.#map.set(key, value);
    if (this.#map.size > this.#max) this.#map.delete(this.#map.keys().next().value!);
    return this;
  }

  get size() {
    return this.#map.size;
  }

  keys() {
    return [...this.#map.keys()];
  }

  /** brand check: `#field in obj` aman dipakai walau object-nya palsu. */
  static isLruCache(value: unknown): value is LruCache<unknown, unknown> {
    return typeof value === 'object' && value !== null && #map in value;
  }

  /** Bikin instance bisa di-iterasi `for...of`. */
  *[Symbol.iterator]() {
    yield* this.#map;
  }
}

// ---------- 3. Extend API platform ----------
/** EventTarget sudah class bawaan; extend di sini wajar. */
export class Thermostat extends EventTarget {
  #celsius = 20;
  get celsius() {
    return this.#celsius;
  }
  set celsius(value: number) {
    if (value === this.#celsius) return;
    this.#celsius = value;
    this.dispatchEvent(new CustomEvent('change', { detail: value }));
  }
}

// ---------- Perbandingan: class "gaya Java" vs versi JS ----------
// JANGAN (kebiasaan Java):
export class StringUtils {
  static capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}
// LEBIH IDIOMATIS:
export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
