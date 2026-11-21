import type { CatRepository } from '../cats/cat.repository.js';
import { Cat } from '../cats/domain/cat.js';

/**
 * CONTRACT TEST: satu set test yang sama dijalankan ke SEMUA implementasi CatRepository.
 * Ini cara konkret membuktikan Liskov Substitution: kalau semua lolos, implementasi mana pun
 * bisa disuntik ke CatsService tanpa mengubah perilaku.
 * (Di Java biasanya abstract test class yang di-extend tiap implementasi.)
 */
export function describeCatRepositoryContract(
  name: string,
  setup: () => Promise<{ repo: CatRepository; teardown?: () => Promise<void> | void }>,
): void {
  describe(`${name} memenuhi kontrak CatRepository`, () => {
    let repo: CatRepository;
    let teardown: (() => Promise<void> | void) | undefined;
    let seq = 0;
    const newCat = (catName = 'Oyen') =>
      Cat.create(
        { name: catName, breed: 'Domestik', age: 2 },
        { id: () => `cat-${++seq}`, now: () => new Date(Date.UTC(2026, 0, 1, 0, 0, seq)) },
      );

    beforeEach(async () => {
      ({ repo, teardown } = await setup());
    });
    afterEach(async () => {
      await teardown?.();
    });

    it('mulai kosong', async () => {
      expect(await repo.findAll()).toEqual([]);
      expect(await repo.findById('nope')).toBeNull();
    });

    it('save lalu findById mengembalikan data yang sama', async () => {
      const cat = newCat();
      await repo.save(cat);
      const found = await repo.findById(cat.id);
      expect(found).toBeInstanceOf(Cat);
      expect(found?.toSnapshot()).toEqual(cat.toSnapshot());
    });

    it('save object yang sudah ada = update (upsert)', async () => {
      const cat = newCat();
      await repo.save(cat);
      cat.adopt('alice');
      await repo.save(cat);
      expect((await repo.findById(cat.id))?.adoptedBy).toBe('alice');
      expect(await repo.findAll()).toHaveLength(1);
    });

    it('perubahan object tanpa save() TIDAK ikut tersimpan', async () => {
      const cat = newCat();
      await repo.save(cat);
      const loaded = (await repo.findById(cat.id))!;
      loaded.adopt('mallory');
      expect((await repo.findById(cat.id))?.status).toBe('available');
    });

    it('findAll urut sesuai waktu dibuat', async () => {
      const a = newCat('Satu');
      const b = newCat('Dua');
      await repo.save(a);
      await repo.save(b);
      expect((await repo.findAll()).map((c) => c.name)).toEqual(['Satu', 'Dua']);
    });

    it('delete', async () => {
      const cat = newCat();
      await repo.save(cat);
      expect(await repo.delete(cat.id)).toBe(true);
      expect(await repo.delete(cat.id)).toBe(false);
      expect(await repo.findById(cat.id)).toBeNull();
    });

    it('save paralel tidak saling menimpa', async () => {
      await Promise.all(Array.from({ length: 10 }, (_, i) => repo.save(newCat(`Kucing ${i}`))));
      expect(await repo.findAll()).toHaveLength(10);
    });
  });
}
