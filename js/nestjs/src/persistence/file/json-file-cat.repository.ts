import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { CatRepository } from '../../cats/cat.repository.js';
import { Cat, type CatSnapshot } from '../../cats/domain/cat.js';

/**
 * PERSISTENCE TANPA DATABASE: simpan ke file JSON.
 *
 * Poin yang biasa ditanya:
 *  - Atomic write: tulis ke file sementara, lalu `rename` (rename di filesystem yang sama itu atomic).
 *    Kalau proses mati di tengah, file lama tetap utuh.
 *  - Race condition: dua request `save` barengan bisa saling timpa (read-modify-write).
 *    Di sini semua operasi tulis diantrikan lewat promise chain (`#queue`) = mutex sederhana.
 *    Ini cuma aman untuk SATU proses. Kalau app di-scale ke beberapa instance, butuh DB.
 *  - Nggak ada query, index, atau transaksi. Cocok untuk config/data kecil, bukan data bisnis utama.
 *
 * Bukan @Injectable karena butuh argumen filePath; dibuat lewat useFactory di PersistenceModule.
 */
export class JsonFileCatRepository extends CatRepository {
  readonly #filePath: string;
  #queue: Promise<unknown> = Promise.resolve();

  constructor(filePath: string) {
    super();
    this.#filePath = filePath;
  }

  async findAll(): Promise<Cat[]> {
    await this.#queue; // tunggu tulisan yang sedang jalan supaya baca data terbaru
    return Object.values(await this.#read()).map((s) => Cat.restore(s));
  }

  async findById(id: string): Promise<Cat | null> {
    await this.#queue;
    const row = (await this.#read())[id];
    return row ? Cat.restore(row) : null;
  }

  save(cat: Cat): Promise<void> {
    return this.#mutate((rows) => {
      rows[cat.id] = cat.toSnapshot();
      return undefined;
    });
  }

  delete(id: string): Promise<boolean> {
    return this.#mutate((rows) => {
      if (!(id in rows)) return false;
      delete rows[id];
      return true;
    });
  }

  #mutate<T>(change: (rows: Record<string, CatSnapshot>) => T): Promise<T> {
    const run = this.#queue.then(async () => {
      const rows = await this.#read();
      const result = change(rows);
      await this.#write(rows);
      return result;
    });
    this.#queue = run.catch(() => undefined); // error satu operasi jangan memblok antrian berikutnya
    return run;
  }

  async #read(): Promise<Record<string, CatSnapshot>> {
    try {
      return JSON.parse(await readFile(this.#filePath, 'utf8')) as Record<string, CatSnapshot>;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return {};
      throw err;
    }
  }

  async #write(rows: Record<string, CatSnapshot>): Promise<void> {
    await mkdir(dirname(this.#filePath), { recursive: true });
    const tmp = `${this.#filePath}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(rows, null, 2));
    await rename(tmp, this.#filePath);
  }
}
