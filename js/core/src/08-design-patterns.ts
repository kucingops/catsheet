/**
 * 08 - DESIGN PATTERN yang sering ditanya, versi JS/TS
 *
 * - Singleton : di Node, MODULE itu sudah singleton (di-cache setelah import pertama).
 *               Jadi `export const config = new Config()` sudah cukup. Di NestJS, provider default juga singleton.
 * - Factory   : sembunyikan logika "class mana yang dibuat".
 * - Strategy  : algoritma bisa ditukar saat runtime (lihat juga auth strategy di js/nestjs).
 * - Observer  : publish/subscribe. Node punya EventEmitter bawaan.
 * - Decorator : bungkus object untuk menambah perilaku tanpa mengubah class aslinya.
 * - Builder   : rakit object kompleks step by step, sering dengan fluent API.
 */
import { EventEmitter } from 'node:events';

// ---------- Singleton ----------
export class AppConfig {
  static #instance: AppConfig | undefined;
  readonly createdAt = Date.now();
  private constructor() {}
  static get instance(): AppConfig {
    return (AppConfig.#instance ??= new AppConfig());
  }
}

// ---------- Strategy + Factory ----------
export interface ShippingStrategy {
  readonly code: string;
  cost(weightKg: number): number;
}
export class RegularShipping implements ShippingStrategy {
  readonly code = 'REG';
  cost(w: number) {
    return 10_000 + w * 2_000;
  }
}
export class ExpressShipping implements ShippingStrategy {
  readonly code = 'EXP';
  cost(w: number) {
    return 25_000 + w * 5_000;
  }
}
export class ShippingFactory {
  static readonly #registry = new Map<string, () => ShippingStrategy>([
    ['REG', () => new RegularShipping()],
    ['EXP', () => new ExpressShipping()],
  ]);
  static create(code: string): ShippingStrategy {
    const make = ShippingFactory.#registry.get(code);
    if (!make) throw new Error(`kurir tidak dikenal: ${code}`);
    return make();
  }
}

// ---------- Observer ----------
export interface OrderEvents {
  paid: [orderId: string, amount: number];
}
/** EventEmitter generik sudah typed sejak @types/node 20+. */
export class OrderService extends EventEmitter<OrderEvents> {
  pay(orderId: string, amount: number): void {
    // ...simpan ke DB...
    this.emit('paid', orderId, amount);
  }
}

// ---------- Decorator (pattern, bukan @decorator) ----------
export interface DataSource {
  read(key: string): string | undefined;
}
export class CachingDataSource implements DataSource {
  readonly #inner: DataSource;
  readonly #cache = new Map<string, string | undefined>();
  constructor(inner: DataSource) {
    this.#inner = inner;
  }
  read(key: string): string | undefined {
    if (!this.#cache.has(key)) this.#cache.set(key, this.#inner.read(key));
    return this.#cache.get(key);
  }
}

// ---------- Builder ----------
export interface HttpRequestSpec {
  method: 'GET' | 'POST';
  url: string;
  headers: Record<string, string>;
  body?: string;
}
export class RequestBuilder {
  #spec: HttpRequestSpec;
  constructor(url: string) {
    this.#spec = { method: 'GET', url, headers: {} };
  }
  post(body: unknown): this {
    this.#spec.method = 'POST';
    this.#spec.body = JSON.stringify(body);
    return this.header('content-type', 'application/json');
  }
  header(name: string, value: string): this {
    this.#spec.headers[name.toLowerCase()] = value;
    return this;
  }
  bearer(token: string): this {
    return this.header('authorization', `Bearer ${token}`);
  }
  build(): Readonly<HttpRequestSpec> {
    return Object.freeze(structuredClone(this.#spec));
  }
}
