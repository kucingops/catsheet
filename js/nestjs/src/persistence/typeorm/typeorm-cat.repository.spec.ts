import { DataSource } from 'typeorm';
import { describeCatRepositoryContract } from '../cat-repository.contract.js';
import { CatOrmEntity } from './cat.orm-entity.js';
import { TypeOrmCatRepository } from './typeorm-cat.repository.js';

// Tanpa Nest sama sekali: bikin DataSource langsung, lalu suntik Repository<CatOrmEntity> manual.
// Ini menunjukkan constructor injection bikin class gampang dites di luar container DI.
describeCatRepositoryContract('TypeOrmCatRepository (TypeORM + sql.js)', async () => {
  const ds = await new DataSource({
    type: 'sqljs',
    entities: [CatOrmEntity],
    synchronize: true,
  }).initialize();
  return { repo: new TypeOrmCatRepository(ds.getRepository(CatOrmEntity)), teardown: () => ds.destroy() };
});
