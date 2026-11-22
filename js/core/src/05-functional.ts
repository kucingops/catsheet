/**
 * 05 - GAYA FUNCTIONAL: data + function, immutability
 *
 * Gaya backend JS modern: data disimpan sebagai object/array biasa (plain data),
 * logika ditulis sebagai function yang menerima data dan mengembalikan data BARU.
 *  - map / filter / reduce / flatMap / some / every / find  -> pengganti for-loop + list mutable
 *  - Object.groupBy, toSorted, toReversed, with             -> versi non-mutasi (ES2023+)
 *  - spread + Object.freeze + `readonly` di TS              -> immutability
 *  - discriminated union + `switch`                         -> pengganti hierarki class
 *  - return Result `{ ok, value | error }`                  -> alternatif throw untuk error yang "diharapkan"
 *
 * Kalau dari Java: mirip Stream API + record + sealed interface + pattern matching `switch`,
 * tapi semuanya bawaan bahasa dan nggak perlu `.stream()` / `.collect()`.
 */

export interface OrderLine {
  readonly sku: string;
  readonly qty: number;
  readonly price: number;
}

// --- map / filter / reduce ---
export const subtotal = (lines: readonly OrderLine[]) => lines.reduce((s, l) => s + l.qty * l.price, 0);
export const skusInBulk = (lines: readonly OrderLine[], min = 10) =>
  lines.filter((l) => l.qty >= min).map((l) => l.sku);
export const formatReceipt = (lines: readonly OrderLine[]) =>
  [...lines.map((l) => `${l.sku} x${l.qty}`), `TOTAL ${subtotal(lines)}`].join('\n');

// --- aturan diskon sebagai FUNCTION, bukan class DiscountRule ---
// Open/Closed versi JS: tambah promo = tambah function ke array. Engine nggak disentuh.
export type DiscountRule = (sub: number, lines: readonly OrderLine[]) => number;
export const minimumSpend =
  (min: number, cut: number): DiscountRule =>
  (sub) =>
    sub >= min ? cut : 0;
export const bulkItem10Percent: DiscountRule = (_sub, lines) =>
  lines.filter((l) => l.qty >= 10).reduce((s, l) => s + l.qty * l.price * 0.1, 0);

export function total(lines: readonly OrderLine[], rules: readonly DiscountRule[] = []) {
  const sub = subtotal(lines);
  const discount = rules.reduce((d, rule) => d + rule(sub, lines), 0);
  return Math.max(0, sub - discount);
}

// --- immutability: update = bikin salinan ---
export interface Cart {
  readonly owner: string;
  readonly lines: readonly OrderLine[];
}
export const addLine = (cart: Cart, line: OrderLine): Cart => ({ ...cart, lines: [...cart.lines, line] });
export const changeQty = (cart: Cart, sku: string, qty: number): Cart => ({
  ...cart,
  lines: cart.lines.map((l) => (l.sku === sku ? { ...l, qty } : l)),
});
export const removeLine = (cart: Cart, sku: string): Cart => ({
  ...cart,
  lines: cart.lines.filter((l) => l.sku !== sku),
});
/** Object.freeze itu SHALLOW. Untuk freeze sampai dalam perlu rekursif. */
export function deepFreeze<T>(o: T): Readonly<T> {
  if (o && typeof o === 'object') {
    Object.values(o).forEach(deepFreeze);
    Object.freeze(o);
  }
  return o;
}

// --- method array non-mutasi (ES2023) vs versi lama yang mutasi ---
export const cheapestFirst = (lines: readonly OrderLine[]) => lines.toSorted((a, b) => a.price - b.price);
export const groupBySize = (lines: readonly OrderLine[]) =>
  Object.groupBy(lines, (l) => (l.qty >= 10 ? 'bulk' : 'retail'));

// --- discriminated union: pengganti abstract class Shape + subclass ---
export type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'rect'; width: number; height: number }
  | { kind: 'triangle'; base: number; height: number };

export function area(s: Shape): number {
  switch (s.kind) {
    case 'circle':
      return Math.PI * s.radius ** 2;
    case 'rect':
      return s.width * s.height;
    case 'triangle':
      return (s.base * s.height) / 2;
    default: {
      // exhaustiveness check: kalau ada kind baru dan lupa ditangani, compiler protes di sini.
      const never: never = s;
      throw new Error(`shape tidak dikenal: ${JSON.stringify(never)}`);
    }
  }
}
export const totalArea = (shapes: readonly Shape[]) => shapes.reduce((sum, s) => sum + area(s), 0);

// --- Result: error yang "diharapkan" jadi nilai, bukan exception ---
export type Result<T, E = string> = { ok: true; value: T } | { ok: false; error: E };
export function parseQty(input: string): Result<number> {
  const n = Number(input);
  if (!Number.isInteger(n)) return { ok: false, error: `bukan bilangan bulat: ${input}` };
  if (n <= 0) return { ok: false, error: 'qty harus > 0' };
  return { ok: true, value: n };
}

// --- iterator & generator: lazy sequence ---
export function* naturals(start = 1) {
  for (let n = start; ; n++) yield n;
}
export function* take<T>(it: Iterable<T>, n: number) {
  if (n <= 0) return;
  for (const x of it) {
    yield x;
    if (--n <= 0) return;
  }
}
