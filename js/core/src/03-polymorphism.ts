/**
 * 03 - POLYMORPHISM
 *
 * Tiga bentuk yang sering ditanya:
 *  1. Subtype polymorphism (runtime): satu referensi `Shape`, perilaku beda tergantung object aslinya.
 *  2. Structural typing (khas TypeScript): object "cocok" ke interface asal BENTUKNYA sama,
 *     nggak perlu `implements`. Java itu nominal typing (harus deklarasi implements).
 *  3. Overloading: Java punya overloading beneran (beberapa method beda signature).
 *     TS cuma punya overload SIGNATURE; implementasinya tetap satu function yang cek tipe argumen sendiri.
 *  (+ parametric polymorphism = generics, contoh `largest<T>` di bawah.)
 */

export abstract class Shape {
  abstract area(): number;
  abstract readonly kind: string;

  describe(): string {
    return `${this.kind} luas ${this.area().toFixed(2)}`;
  }
}

export class Circle extends Shape {
  readonly kind = 'circle';
  readonly radius: number;
  constructor(radius: number) {
    super();
    this.radius = radius;
  }
  area(): number {
    return Math.PI * this.radius ** 2;
  }
}

export class Rectangle extends Shape {
  readonly kind = 'rectangle';
  readonly width: number;
  readonly height: number;
  constructor(width: number, height: number) {
    super();
    this.width = width;
    this.height = height;
  }
  area(): number {
    return this.width * this.height;
  }
}

/** Caller cuma tahu `Shape`. Tambah shape baru = tanpa ubah fungsi ini (Open/Closed). */
export function totalArea(shapes: readonly Shape[]): number {
  return shapes.reduce((sum, s) => sum + s.area(), 0);
}

// --- 2. structural typing ---
export interface HasArea {
  area(): number;
}

/** Object literal biasa juga diterima, karena bentuknya cocok. */
export function biggest(items: readonly HasArea[]): HasArea | undefined {
  return items.reduce<HasArea | undefined>((max, it) => (!max || it.area() > max.area() ? it : max), undefined);
}

// --- 3. overload signatures ---
export function format(value: number): string;
export function format(value: Date): string;
export function format(value: string[]): string;
export function format(value: number | Date | string[]): string {
  if (typeof value === 'number') return value.toLocaleString('id-ID');
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value.join(', ');
}

// --- parametric polymorphism (generics) ---
export interface Comparable<T> {
  compareTo(other: T): number;
}

export function largest<T extends Comparable<T>>(items: readonly T[]): T {
  if (items.length === 0) throw new Error('list kosong');
  return items.reduce((a, b) => (b.compareTo(a) > 0 ? b : a));
}

export class Money implements Comparable<Money> {
  readonly cents: number;
  constructor(cents: number) {
    this.cents = cents;
  }
  compareTo(other: Money): number {
    return this.cents - other.cents;
  }
}
