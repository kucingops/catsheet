/**
 * 02 - INHERITANCE
 *
 * - `extends` = single inheritance (sama seperti Java, satu parent class).
 * - `super(...)` WAJIB dipanggil sebelum pakai `this` di constructor subclass.
 * - `protected` = bisa diakses subclass (cuma dicek compiler TS, nggak ada package-private seperti Java).
 * - `override` (dengan `noImplicitOverride`) = padanan `@Override` di Java, compiler protes kalau method parent nggak ada.
 * - Di balik layar, class JS tetap PROTOTYPE chain. Lihat 07-prototype-and-this.ts.
 */

export class Employee {
  readonly name: string;
  protected readonly baseSalary: number;
  static count = 0; // static field: milik class, bukan instance

  constructor(name: string, baseSalary: number) {
    this.name = name;
    this.baseSalary = baseSalary;
    Employee.count++;
  }

  monthlyPay(): number {
    return this.baseSalary;
  }

  describe(): string {
    return `${this.name} (${this.role()}) dibayar ${this.monthlyPay()}`;
  }

  // dipanggil dari describe(): dynamic dispatch, versi subclass yang jalan.
  role(): string {
    return 'staff';
  }
}

export class Manager extends Employee {
  readonly allowance: number;
  readonly #reports: Employee[] = [];

  // Catatan: parameter property (`constructor(private x: number)`) sengaja nggak dipakai
  // di folder ini supaya file bisa langsung dijalankan `node file.ts` (type stripping).
  constructor(name: string, baseSalary: number, allowance = 0) {
    super(name, baseSalary); // harus sebelum akses `this`
    this.allowance = allowance;
  }

  addReport(e: Employee): void {
    this.#reports.push(e);
  }

  get reportCount(): number {
    return this.#reports.length;
  }

  // override + panggil implementasi parent via super
  override monthlyPay(): number {
    return super.monthlyPay() + this.allowance + this.#reports.length * 100;
  }

  override role(): string {
    return 'manager';
  }
}

/**
 * Subclass dari built-in (Error) juga pakai extends.
 * Error custom ini yang biasa dipakai buat domain error (mirip `extends RuntimeException`).
 */
export class ValidationError extends Error {
  readonly field: string;
  constructor(field: string, message: string) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}
