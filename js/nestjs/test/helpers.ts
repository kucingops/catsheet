import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/configure-app.js';
import type { PersistenceOptions } from '../src/persistence/persistence-driver.js';

export async function createApp(persistence: PersistenceOptions = { driver: 'memory' }) {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule.register(persistence)] }).compile();
  const app = configureApp(moduleRef.createNestApplication()) as INestApplication<App>;
  await app.init();
  return app;
}

export const basic = (u: string, p: string) => `Basic ${Buffer.from(`${u}:${p}`).toString('base64')}`;
