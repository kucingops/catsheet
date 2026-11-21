import { type DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { AuthModule } from './auth/auth.module.js';
import { CatsModule } from './cats/cats.module.js';
import { DomainExceptionFilter } from './common/domain-exception.filter.js';
import { PersistenceModule } from './persistence/persistence.module.js';
import type { PersistenceOptions } from './persistence/persistence-driver.js';

/**
 * Root module dibuat dinamis supaya pilihan storage bisa dikirim dari luar
 * (main.ts baca env PERSISTENCE, e2e test mengetes semua driver).
 */
@Module({})
export class AppModule {
  static register(persistence: PersistenceOptions): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PersistenceModule.forRoot(persistence),
        AuthModule,
        CatsModule,
      ],
      providers: [{ provide: APP_FILTER, useClass: DomainExceptionFilter }],
    };
  }
}
