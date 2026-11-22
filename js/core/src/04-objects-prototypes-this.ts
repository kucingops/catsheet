/**
 * 04 - OBJECT, PROTOTYPE & `this`
 *
 * JS itu bahasa berbasis OBJECT dan PROTOTYPE, bukan berbasis class.
 *  - Object literal `{}` adalah cara utama bikin object. Nggak perlu class buat satu bentuk data.
 *  - Pewarisan = DELEGASI ke prototype: kalau property nggak ada di object, lookup naik ke [[Prototype]]-nya.
 *  - `class` (ES2015) cuma syntactic sugar di atas mekanisme itu.
 *  - `this` ditentukan CARA PEMANGGILAN, bukan tempat function ditulis:
 *        obj.method()            -> this = obj
 *        const f = obj.method; f() -> this = undefined (ESM selalu strict) -> TypeError
 *        f.call(x) / f.bind(x)   -> this = x
 *        arrow function          -> nggak punya this; pakai this dari scope luar (lexical)
 *
 * Kalau dari Java: `this` di Java selalu instance-nya. Di JS jangan asumsi begitu.
 * Banyak kode JS modern menghindari `this` sama sekali (pakai closure, lihat 02).
 */

// --- object literal: shorthand, computed key, method, spread, destructuring ---
export function makePoint(x: number, y: number) {
  return { x, y }; // shorthand property, sama dengan { x: x, y: y }
}
export const withKey = <K extends string, V>(key: K, value: V) => ({ [key]: value }) as Record<K, V>;
export const move = (p: { x: number; y: number }, dx: number, dy = 0) => ({ ...p, x: p.x + dx, y: p.y + dy });
export function describeCat({ name, age = 0, ...rest }: { name: string; age?: number; [k: string]: unknown }) {
  return `${name} (${age} th), info lain: ${Object.keys(rest).join(',') || '-'}`;
}

// --- prototype delegation tanpa class ---
export const animal = {
  describe(this: { name: string; sound: string }) {
    return `${this.name} bilang ${this.sound}`;
  },
};
export function makeCat(name: string) {
  // Object.create(proto) = bikin object yang [[Prototype]]-nya proto.
  return Object.assign(Object.create(animal) as typeof animal, { name, sound: 'meong' });
}

// --- constructor function "jadul" vs class: hasil runtime-nya setara ---
export function LegacyCounter(this: { count: number }, start: number) {
  this.count = start;
}
LegacyCounter.prototype.increment = function (this: { count: number }) {
  return ++this.count;
};
export class Counter {
  count: number;
  constructor(start: number) {
    this.count = start;
  }
  increment() {
    return ++this.count;
  }
  // arrow function sebagai field: `this` terkunci ke instance (tapi dibuat ulang per instance).
  incrementBound = () => ++this.count;
}

/** Rantai prototype sebuah object, dari terdekat ke atas. */
export function prototypeChain(obj: object): string[] {
  const names: string[] = [];
  for (let p = Object.getPrototypeOf(obj); p; p = Object.getPrototypeOf(p)) {
    names.push(p.constructor?.name ?? '(anonymous)');
  }
  return names;
}

/** Simulasi API yang menerima callback: event handler, setTimeout, .map, dll. */
export const callLater = <T>(fn: () => T): T => fn();

// --- call / apply / bind ---
export function introduce(this: { name: string }, greeting: string, punct = '!') {
  return `${greeting}, aku ${this.name}${punct}`;
}

// --- equality & copy: object itu reference ---
export const shallowCopy = <T extends object>(o: T): T => ({ ...o });
export const deepCopy = <T>(o: T): T => structuredClone(o);
