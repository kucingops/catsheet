import type { Cat } from './domain/cat.js';

/**
 * PORT / ABSTRAKSI repository.
 *
 * Kenapa abstract class, bukan interface? Interface TypeScript hilang saat runtime,
 * jadi nggak bisa dipakai sebagai token DI. Abstract class tetap ada di runtime,
 * sehingga service cukup tulis `constructor(private readonly cats: CatRepository)`
 * dan Nest yang menentukan implementasi mana yang disuntik (lihat PersistenceModule).
 * Mirip `interface CatRepository` + @Profile/@ConditionalOnProperty di Spring.
 *
 * Semua method async walaupun implementasi in-memory sebenarnya sync:
 * kontrak harus seragam supaya implementasi bisa saling menggantikan (Liskov).
 */
export abstract class CatRepository {
  abstract findAll(): Promise<Cat[]>;
  abstract findById(id: string): Promise<Cat | null>;
  /** upsert: insert kalau baru, update kalau sudah ada */
  abstract save(cat: Cat): Promise<void>;
  /** true kalau ada yang terhapus */
  abstract delete(id: string): Promise<boolean>;
}
