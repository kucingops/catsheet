import { Cat } from '../../cats/domain/cat.js';
import { describeCatRepositoryContract } from '../cat-repository.contract.js';
import { SqliteCatRepository } from './sqlite-cat.repository.js';

describeCatRepositoryContract('SqliteCatRepository (node:sqlite, raw SQL)', async () => {
  const repo = new SqliteCatRepository(':memory:');
  return { repo, teardown: () => repo.onModuleDestroy() };
});

describe('SqliteCatRepository (khusus SQL)', () => {
  it('transaksi: kalau satu gagal, semua di-rollback', async () => {
    const repo = new SqliteCatRepository();
    const good = Cat.create({ name: 'Oyen', breed: 'x', age: 1 });
    // bypass validasi domain untuk mensimulasikan data jelek yang ditolak CHECK constraint DB
    const bad = Cat.restore({ ...good.toSnapshot(), id: 'bad', age: -1 });

    await expect(repo.saveAll([good, bad])).rejects.toThrow(/CHECK constraint/);
    expect(await repo.findAll()).toEqual([]);
    repo.onModuleDestroy();
  });

  it('parameter binding mencegah SQL injection', async () => {
    const repo = new SqliteCatRepository();
    await repo.save(Cat.create({ name: 'Oyen', breed: 'x', age: 1 }));
    expect(await repo.findById("' OR '1'='1")).toBeNull();
    repo.onModuleDestroy();
  });
});
