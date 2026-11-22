/**
 * 03 - MODULE (ESM): unit enkapsulasi utama di JS
 *
 * Satu file = satu module. Yang di-`export` itu API publik, sisanya privat milik file ini.
 * Module dievaluasi SEKALI, lalu di-cache: semua yang import dapat instance yang sama.
 *
 * Kalau dari Java:
 *  - `private` di level class  -> di JS cukup "nggak di-export" (private di level file).
 *  - Singleton pattern         -> module itu sendiri sudah singleton. Nggak perlu `getInstance()`.
 *  - Utility class (`final class X { private X(){} static ... }`) -> kumpulan `export function`.
 *  - Package                   -> folder + file `index.ts` (barrel) yang re-export API publik.
 */

// --- privat level module: nggak di-export, nggak bisa diakses dari luar ---
const cats = new Map<string, { id: string; name: string }>();
let nextId = 1;
const normalize = (name: string) => name.trim().replace(/\s+/g, ' ');

// --- API publik ---
export function addCat(name: string) {
  const cat = { id: `cat-${nextId++}`, name: normalize(name) };
  cats.set(cat.id, cat);
  return cat;
}
export const findCat = (id: string) => cats.get(id);
export const countCats = () => cats.size;
/** Biasanya cuma buat test: reset state module. */
export function resetCats() {
  cats.clear();
  nextId = 1;
}

// --- "konstanta" dan config: export const + Object.freeze ---
export const config = Object.freeze({
  appName: 'catsheet',
  maxCats: 9, // kucing punya 9 nyawa
});

// --- default export vs named export ---
// Konvensi modern: lebih suka named export (auto-import & rename lebih aman). Default export tetap ada.
export default function describeStore() {
  return `${config.appName}: ${cats.size} kucing`;
}

// --- dynamic import: load module saat dibutuhkan (lazy), hasilnya Promise ---
export async function loadOptional<T>(specifier: string): Promise<T | undefined> {
  try {
    return (await import(specifier)) as T;
  } catch {
    return undefined; // misal dependency opsional yang nggak ter-install
  }
}
