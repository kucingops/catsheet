/**
 * 07 - PROTOTYPE & `this` (bagian yang paling beda dari Java)
 *
 * - `class` di JS itu syntactic sugar di atas prototype. Method disimpan di `Class.prototype`,
 *   dan setiap instance punya link `[[Prototype]]` ke situ. Lookup property jalan naik rantai prototype.
 * - `this` di JS TIDAK terikat ke object secara permanen. Nilainya ditentukan CARA PEMANGGILAN:
 *     obj.method()       -> this = obj
 *     const f = obj.method; f()  -> this = undefined (strict mode / ESM) => error
 *     arrow function      -> this diambil dari scope tempat arrow itu dibuat (lexical this)
 *     f.call(x) / f.bind(x) -> this = x
 *   Ini sumber bug klasik waktu method dioper jadi callback (event handler, setTimeout, .map).
 */

// Versi "jadul" sebelum ES2015 class: constructor function + prototype.
export function LegacyCounter(this: { count: number }, start: number) {
  this.count = start;
}
LegacyCounter.prototype.increment = function (this: { count: number }) {
  return ++this.count;
};

// Versi class, hasil runtime-nya setara.
export class Counter {
  count: number;
  constructor(start: number) {
    this.count = start;
  }
  increment(): number {
    return ++this.count;
  }
  // arrow function sebagai class field: `this` terkunci ke instance.
  // Trade-off: tiap instance bikin function baru (bukan di prototype), jadi pakai seperlunya.
  incrementBound = (): number => ++this.count;
}

/** Simulasi API yang menerima callback, misalnya event emitter atau setTimeout. */
export function callLater<T>(fn: () => T): T {
  return fn();
}

/** Rantai prototype sebuah object, dari terdekat ke atas. */
export function prototypeChain(obj: object): string[] {
  const names: string[] = [];
  let p = Object.getPrototypeOf(obj);
  while (p) {
    names.push(p.constructor.name);
    p = Object.getPrototypeOf(p);
  }
  return names;
}

/** Object.create: bikin object dengan prototype tertentu, tanpa class sama sekali. */
export const animalProto = {
  speak(this: { name: string; sound: string }) {
    return `${this.name} bilang ${this.sound}`;
  },
};
export function makeCat(name: string) {
  const cat = Object.create(animalProto) as typeof animalProto & { name: string; sound: string };
  cat.name = name;
  cat.sound = 'meong';
  return cat;
}
