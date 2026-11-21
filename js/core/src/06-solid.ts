/**
 * 06 - SOLID (versi ringkas, satu contoh per prinsip)
 *
 * S - Single Responsibility : satu class, satu alasan untuk berubah.
 * O - Open/Closed           : tambah perilaku baru dengan menambah class, bukan mengedit if/else lama.
 * L - Liskov Substitution   : subclass harus bisa menggantikan parent TANPA bikin caller kaget.
 * I - Interface Segregation : interface kecil & spesifik, jangan paksa class implement method yang nggak dipakai.
 * D - Dependency Inversion  : modul level atas bergantung ke abstraksi, bukan ke detail (DB, HTTP, dll).
 */

// ---------- S ----------
export interface OrderLine {
  sku: string;
  qty: number;
  price: number;
}
/** Cuma ngitung. Format/print ada di class lain. */
export class OrderCalculator {
  subtotal(lines: readonly OrderLine[]): number {
    return lines.reduce((s, l) => s + l.qty * l.price, 0);
  }
}
export class ReceiptFormatter {
  format(lines: readonly OrderLine[], total: number): string {
    return [...lines.map((l) => `${l.sku} x${l.qty}`), `TOTAL ${total}`].join('\n');
  }
}

// ---------- O ----------
export interface DiscountRule {
  apply(subtotal: number, lines: readonly OrderLine[]): number; // return potongan
}
export class MinimumSpendDiscount implements DiscountRule {
  readonly #min: number;
  readonly #cut: number;
  constructor(min: number, cut: number) {
    this.#min = min;
    this.#cut = cut;
  }
  apply(subtotal: number): number {
    return subtotal >= this.#min ? this.#cut : 0;
  }
}
export class BulkItemDiscount implements DiscountRule {
  apply(_subtotal: number, lines: readonly OrderLine[]): number {
    return lines.filter((l) => l.qty >= 10).reduce((s, l) => s + l.qty * l.price * 0.1, 0);
  }
}
/** Tambah promo baru = bikin class DiscountRule baru. PriceEngine nggak disentuh. */
export class PriceEngine {
  readonly #rules: readonly DiscountRule[];
  readonly #calc = new OrderCalculator();
  constructor(rules: readonly DiscountRule[]) {
    this.#rules = rules;
  }
  total(lines: readonly OrderLine[]): number {
    const subtotal = this.#calc.subtotal(lines);
    const discount = this.#rules.reduce((d, r) => d + r.apply(subtotal, lines), 0);
    return Math.max(0, subtotal - discount);
  }
}

// ---------- L ----------
// Contoh PELANGGARAN klasik: Square extends Rectangle lalu setWidth ikut mengubah height.
export class MutableRectangle {
  width = 0;
  height = 0;
  setWidth(w: number) {
    this.width = w;
  }
  setHeight(h: number) {
    this.height = h;
  }
  area() {
    return this.width * this.height;
  }
}
export class BadSquare extends MutableRectangle {
  override setWidth(w: number) {
    this.width = w;
    this.height = w;
  }
  override setHeight(h: number) {
    this.width = h;
    this.height = h;
  }
}
/** Caller yang wajar untuk Rectangle. Dengan BadSquare hasilnya salah -> LSP dilanggar. */
export function stretch(r: MutableRectangle): number {
  r.setWidth(5);
  r.setHeight(4);
  return r.area(); // harapan caller: 20
}
// Perbaikan: jangan jadikan Square subtype dari Rectangle yang mutable.
// Pakai abstraksi immutable bersama (lihat Shape di 03-polymorphism.ts).

// ---------- I ----------
export interface Readable<T> {
  findById(id: string): T | undefined;
}
export interface Writable<T> {
  save(item: T): void;
}
/** Report cuma butuh baca. Dia nggak perlu tahu ada method save/delete. */
export class ReportService {
  readonly #repo: Readable<{ id: string; total: number }>;
  constructor(repo: Readable<{ id: string; total: number }>) {
    this.#repo = repo;
  }
  totalOf(id: string): number {
    return this.#repo.findById(id)?.total ?? 0;
  }
}

// ---------- D ----------
export interface Clock {
  now(): Date;
}
export const systemClock: Clock = { now: () => new Date() };

/** Bergantung ke abstraksi Clock, bukan langsung `new Date()`. Hasilnya: bisa di-test deterministik. */
export class GreetingService {
  readonly #clock: Clock;
  constructor(clock: Clock = systemClock) {
    this.#clock = clock;
  }
  greet(name: string): string {
    const h = this.#clock.now().getUTCHours();
    const part = h < 11 ? 'pagi' : h < 15 ? 'siang' : h < 18 ? 'sore' : 'malam';
    return `Selamat ${part}, ${name}`;
  }
}
