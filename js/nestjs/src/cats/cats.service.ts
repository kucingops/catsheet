import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../common/domain-error.js';
import { CatRepository } from './cat.repository.js';
import { Cat, type NewCat } from './domain/cat.js';

export interface CatStats {
  total: number;
  available: number;
  adopted: number;
  byBreed: Record<string, number>;
}

/**
 * APPLICATION SERVICE: orkestrasi use case (ambil -> panggil domain -> simpan).
 * Aturan bisnis ada di `Cat`, bukan di sini, supaya service tetap tipis.
 *
 * DEPENDENCY INVERSION: service bergantung ke abstraksi `CatRepository`.
 * Nest melihat tipe parameter constructor (via emitDecoratorMetadata) dan menyuntik
 * implementasi yang didaftarkan PersistenceModule. Sama persis dengan constructor injection Spring.
 */
@Injectable()
export class CatsService {
  constructor(private readonly cats: CatRepository) {}

  findAll(): Promise<Cat[]> {
    return this.cats.findAll();
  }

  async findOne(id: string): Promise<Cat> {
    const cat = await this.cats.findById(id);
    if (!cat) throw new NotFoundError(`kucing ${id} tidak ditemukan`);
    return cat;
  }

  async register(input: NewCat): Promise<Cat> {
    const cat = Cat.create(input);
    await this.cats.save(cat);
    return cat;
  }

  async adopt(id: string, adopter: string): Promise<Cat> {
    const cat = await this.findOne(id);
    cat.adopt(adopter); // bisa throw ConflictError -> 409
    await this.cats.save(cat);
    return cat;
  }

  async remove(id: string): Promise<void> {
    if (!(await this.cats.delete(id))) throw new NotFoundError(`kucing ${id} tidak ditemukan`);
  }

  async stats(): Promise<CatStats> {
    const all = await this.cats.findAll();
    const byBreed: Record<string, number> = {};
    for (const c of all) byBreed[c.breed] = (byBreed[c.breed] ?? 0) + 1;
    const available = all.filter((c) => c.isAvailable).length;
    return { total: all.length, available, adopted: all.length - available, byBreed };
  }
}
