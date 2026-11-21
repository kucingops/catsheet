/**
 * 05 - COMPOSITION OVER INHERITANCE
 *
 * Inheritance = relasi "is-a" dan mengikat erat (perubahan parent bisa merusak child: fragile base class).
 * Composition = relasi "has-a": object punya object lain dan mendelegasikan kerja ke situ.
 * Dependency dikirim lewat constructor (constructor injection), jadi gampang di-swap & di-test.
 *
 * Bonus khas JS: MIXIN, cara "pinjam" perilaku ke beberapa class tanpa multiple inheritance.
 */

export interface Engine {
  start(): string;
}
export class PetrolEngine implements Engine {
  start(): string {
    return 'brum brum';
  }
}
export class ElectricEngine implements Engine {
  start(): string {
    return 'ngiiing';
  }
}

export class Car {
  // has-a Engine. Ganti mesin cukup kirim object lain, nggak perlu bikin subclass PetrolCar/ElectricCar.
  readonly #engine: Engine;
  constructor(engine: Engine) {
    this.#engine = engine;
  }
  drive(): string {
    return `mesin: ${this.#engine.start()}`;
  }
}

// ---------- Mixin ----------
// Mixin = function yang menerima class dan mengembalikan class baru yang sudah ditambah perilaku.
type Constructor<T = object> = new (...args: any[]) => T;

export function Timestamped<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    createdAt = new Date(0);
    touch(now: Date): void {
      this.createdAt = now;
    }
  };
}

export function SoftDeletable<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    deletedAt: Date | null = null;
    softDelete(now: Date): void {
      this.deletedAt = now;
    }
    get isDeleted(): boolean {
      return this.deletedAt !== null;
    }
  };
}

class BaseDocument {
  readonly title: string;
  constructor(title: string) {
    this.title = title;
  }
}

/** Gabungan dua mixin. Mirip default method di beberapa interface Java. */
export class Article extends SoftDeletable(Timestamped(BaseDocument)) {}
