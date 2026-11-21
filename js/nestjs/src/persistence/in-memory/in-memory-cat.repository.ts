import { Injectable } from '@nestjs/common';
import { CatRepository } from '../../cats/cat.repository.js';
import { Cat, type CatSnapshot } from '../../cats/domain/cat.js';

/**
 * TANPA PERSISTENCE: data cuma hidup di memori proses. Restart = hilang.
 *
 * Yang disimpan SNAPSHOT, bukan object Cat-nya langsung. Kenapa? Kalau object yang sama
 * dikembalikan ke caller, caller bisa mengubah state (cat.adopt()) TANPA memanggil save(),
 * dan perubahan itu "tersimpan diam-diam". Itu perilaku yang beda dari repository DB,
 * jadi melanggar kontrak (Liskov). Dengan snapshot, semua implementasi berperilaku sama.
 */
@Injectable()
export class InMemoryCatRepository extends CatRepository {
  readonly #rows = new Map<string, CatSnapshot>();

  async findAll(): Promise<Cat[]> {
    return [...this.#rows.values()].map((s) => Cat.restore(s));
  }

  async findById(id: string): Promise<Cat | null> {
    const row = this.#rows.get(id);
    return row ? Cat.restore(row) : null;
  }

  async save(cat: Cat): Promise<void> {
    this.#rows.set(cat.id, cat.toSnapshot());
  }

  async delete(id: string): Promise<boolean> {
    return this.#rows.delete(id);
  }
}
