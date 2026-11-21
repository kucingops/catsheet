import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { type DynamicModule, Module, type Provider } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatRepository } from '../cats/cat.repository.js';
import { JsonFileCatRepository } from './file/json-file-cat.repository.js';
import { InMemoryCatRepository } from './in-memory/in-memory-cat.repository.js';
import type { PersistenceOptions } from './persistence-driver.js';
import { SqliteCatRepository } from './sqlite/sqlite-cat.repository.js';
import { CatOrmEntity } from './typeorm/cat.orm-entity.js';
import { TypeOrmCatRepository } from './typeorm/typeorm-cat.repository.js';

/**
 * DYNAMIC MODULE: memilih implementasi CatRepository saat startup.
 * Padanan di Spring: beberapa @Bean dengan @Profile / @ConditionalOnProperty.
 *
 * Tiga cara mendaftarkan provider yang dipakai di sini:
 *   - useClass   : Nest yang `new`, dependency di-resolve otomatis (InMemory, TypeORM)
 *   - useFactory : kita yang `new`, cocok kalau butuh argumen non-DI (file path, lokasi DB)
 *   - (useValue  : object jadi, biasanya buat test/mock)
 *
 * Kuncinya: `provide: CatRepository`. Semua consumer minta CatRepository, nggak pernah minta implementasinya.
 */
@Module({})
export class PersistenceModule {
  static forRoot(options: PersistenceOptions): DynamicModule {
    const imports: DynamicModule[] = [];
    if (options.database && options.database !== ':memory:') {
      mkdirSync(dirname(options.database), { recursive: true }); // SQLite nggak mau bikin folder sendiri
    }
    let provider: Provider;

    switch (options.driver) {
      case 'memory':
        provider = { provide: CatRepository, useClass: InMemoryCatRepository };
        break;
      case 'file':
        provider = {
          provide: CatRepository,
          useFactory: () => new JsonFileCatRepository(options.filePath ?? 'data/cats.json'),
        };
        break;
      case 'sqlite':
        provider = { provide: CatRepository, useFactory: () => new SqliteCatRepository(options.database) };
        break;
      case 'typeorm':
        imports.push(
          TypeOrmModule.forRoot({
            // sql.js = SQLite versi WebAssembly, jadi nggak perlu compile native module.
            // Ganti ke Postgres cukup ubah blok ini (type: 'postgres', host, ...). Repository & service tetap.
            type: 'sqljs',
            location: options.database,
            autoSave: Boolean(options.database),
            entities: [CatOrmEntity],
            synchronize: true, // auto bikin tabel. DEV ONLY, di production pakai migration.
          }),
          TypeOrmModule.forFeature([CatOrmEntity]),
        );
        provider = { provide: CatRepository, useClass: TypeOrmCatRepository };
        break;
    }

    return {
      module: PersistenceModule,
      global: true, // CatRepository bisa di-inject di module mana pun tanpa import ulang
      imports,
      providers: [provider],
      exports: [CatRepository],
    };
  }
}
