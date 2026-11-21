/**
 * 08 - DESIGN PATTERN, VERSI JS
 *
 * Banyak pattern GoF ada karena Java dulu nggak punya first-class function.
 * Di JS, sebagian besar "hilang" jadi fitur bahasa biasa:
 *
 * | Pattern Java          | Versi JS                                                  |
 * |-----------------------|-----------------------------------------------------------|
 * | Singleton             | module (sudah di-cache, lihat 03)                         |
 * | Factory               | function yang return object                               |
 * | Strategy / Command    | function yang dioper sebagai argumen                      |
 * | Observer              | EventEmitter (Node) / EventTarget (standar web)            |
 * | Decorator             | higher-order function yang membungkus function lain       |
 * | Builder               | options object + default value (+ spread)                 |
 * | Iterator              | generator `function*` + `for...of`                        |
 * | Template method       | function menerima "hook" sebagai parameter                |
 * | Middleware / Chain    | array function `(ctx, next) => ...` (gaya Express/Koa)    |
 */
import { EventEmitter } from 'node:events';

// ---------- Strategy: function sebagai argumen ----------
export const sortCats = <T>(cats: readonly T[], compare: (a: T, b: T) => number) => cats.toSorted(compare);
export const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);
export const byAgeDesc = (a: { age: number }, b: { age: number }) => b.age - a.age;

// ---------- Observer ----------
// Node: EventEmitter sudah generic & typed. Komposisi (punya emitter), bukan `extends EventEmitter`.
export interface OrderEvents {
  paid: [orderId: string, amount: number];
}
export function createOrderService() {
  const events = new EventEmitter<OrderEvents>();
  return {
    on: events.on.bind(events),
    pay(orderId: string, amount: number) {
      // ...simpan ke DB...
      events.emit('paid', orderId, amount);
    },
  };
}
// Standar web (juga ada di Node, browser, Deno, Bun): EventTarget + CustomEvent.
export function createDoorbell() {
  const target = new EventTarget();
  return {
    onRing: (fn: (who: string) => void) =>
      target.addEventListener('ring', (e) => fn((e as CustomEvent<string>).detail)),
    ring: (who: string) => target.dispatchEvent(new CustomEvent('ring', { detail: who })),
  };
}

// ---------- Decorator: higher-order function ----------

export const withLogging =
  <A extends unknown[], R>(name: string, fn: (...args: A) => R, log: (msg: string) => void = console.log) =>
  (...args: A): R => {
    log(`${name}(${args.map((a) => JSON.stringify(a)).join(', ')})`);
    return fn(...args);
  };

export function withCache<R>(fn: (key: string) => R, ttlMs = Infinity, now = () => Date.now()) {
  const cache = new Map<string, { value: R; at: number }>();
  return (key: string): R => {
    const hit = cache.get(key);
    if (hit && now() - hit.at < ttlMs) return hit.value;
    const value = fn(key);
    cache.set(key, { value, at: now() });
    return value;
  };
}

// ---------- Builder -> options object ----------
export interface RequestOptions {
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: unknown;
  token?: string;
}
export function buildRequest(url: string, { method = 'GET', headers = {}, body, token }: RequestOptions = {}) {
  return Object.freeze({
    method: body !== undefined ? 'POST' : method,
    url,
    headers: {
      ...(body !== undefined && { 'content-type': 'application/json' }),
      ...(token && { authorization: `Bearer ${token}` }),
      ...Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])),
    },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
}

// ---------- Middleware chain (gaya Express / Koa) ----------
export type Middleware<C> = (ctx: C, next: () => Promise<void>) => Promise<void>;
export function compose<C>(middlewares: readonly Middleware<C>[]) {
  return (ctx: C) => {
    const dispatch = (i: number): Promise<void> =>
      i < middlewares.length ? middlewares[i]!(ctx, () => dispatch(i + 1)) : Promise.resolve();
    return dispatch(0);
  };
}
