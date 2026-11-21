/**
 * 06 - POLYMORPHISM, COMPOSITION & DEPENDENCY INJECTION ala JS
 *
 * - Duck typing / structural typing: "kalau bisa `area()`, berarti dia punya area".
 *   Nggak perlu `implements`, nggak perlu parent class. TS cuma mengecek BENTUK object.
 * - Polymorphism paling sederhana di JS = object berisi function (atau Map key -> function).
 * - Composition: gabung kemampuan kecil jadi object, pakai spread / Object.assign. Pengganti mixin & inheritance.
 * - DI: dependency dioper sebagai parameter factory function (atau argumen function). Tanpa container.
 *   Test cukup oper object palsu.
 *
 * Kalau dari Java: interface + beberapa class implementasi + Spring @Autowired
 *   -> di JS: tipe (opsional) + beberapa object literal + parameter.
 */

// --- duck typing ---
export interface HasArea {
  area(): number;
}
export const biggest = <T extends HasArea>(items: readonly T[]) =>
  items.reduce<T | undefined>((max, it) => (!max || it.area() > max.area() ? it : max), undefined);

// --- polymorphism lewat lookup table: pengganti switch/instanceof dan pengganti class hierarchy ---
export type ShippingCost = (weightKg: number) => number;
export const shipping: Readonly<Record<string, ShippingCost>> = Object.freeze({
  REG: (w) => 10_000 + w * 2_000,
  EXP: (w) => 25_000 + w * 5_000,
  SAME_DAY: (w) => 40_000 + w * 6_000,
});
export function shippingCost(code: string, weightKg: number): number {
  const cost = shipping[code];
  if (!cost) throw new Error(`kurir tidak dikenal: ${code}`);
  return cost(weightKg);
}

// --- composition: kemampuan kecil digabung, bukan diwarisi ---
// Tiap "trait" = function yang menerima state dan mengembalikan method.
interface Named {
  name: string;
}
const canEat = (self: Named) => ({ eat: (food: string) => `${self.name} makan ${food}` });
const canMeow = (self: Named) => ({ meow: () => `${self.name}: meong` });
const canSwim = (self: Named) => ({ swim: () => `${self.name} berenang` });

export const createCat = (name: string) => {
  const self = { name };
  return { ...self, ...canEat(self), ...canMeow(self) };
};
// Kucing Turkish Van suka berenang. Di OOP klasik ini bikin dilema hierarki (Cat? Swimmer?).
// Di sini tinggal tambah kemampuan.
export const createTurkishVan = (name: string) => {
  const self = { name };
  return { ...self, ...canEat(self), ...canMeow(self), ...canSwim(self) };
};

// --- dependency injection: dependency = parameter ---
export interface CatRepo {
  findById(id: string): { id: string; name: string } | undefined;
  save(cat: { id: string; name: string }): void;
}
export interface Deps {
  repo: CatRepo;
  now?: () => Date;
  log?: (msg: string) => void;
}

/** "Service" = factory function yang menutup (close over) dependency-nya. */
export function createCatService({ repo, now = () => new Date(), log = () => {} }: Deps) {
  return {
    rename(id: string, newName: string) {
      const cat = repo.findById(id);
      if (!cat) throw new Error(`kucing ${id} tidak ada`);
      const updated = { ...cat, name: newName.trim() };
      repo.save(updated);
      log(`[${now().toISOString()}] rename ${id} -> ${updated.name}`);
      return updated;
    },
  };
}

/** Implementasi in-memory: juga factory, juga closure. */
export function createInMemoryRepo(seed: Array<{ id: string; name: string }> = []): CatRepo {
  const data = new Map(seed.map((c) => [c.id, c]));
  return {
    findById: (id) => data.get(id),
    save: (cat) => void data.set(cat.id, cat),
  };
}
