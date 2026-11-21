import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { DEMO_API_KEY } from '../src/auth/users/user.store.js';
import { PERSISTENCE_DRIVERS } from '../src/persistence/persistence-driver.js';
import { basic, createApp } from './helpers.js';

const alice = basic('alice', 'alice123');
const bob = basic('bob', 'bob123'); // admin

/**
 * Skenario yang SAMA dijalankan untuk tiap driver persistence.
 * Kalau semua hijau, terbukti controller/service benar-benar nggak peduli storage-nya apa.
 */
describe.each(PERSISTENCE_DRIVERS)('Cats API dengan PERSISTENCE=%s (e2e)', (driver) => {
  let app: INestApplication<App>;
  let dir: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'catsheet-e2e-'));
    app = await createApp({ driver, filePath: join(dir, 'cats.json') });
  });
  afterAll(async () => {
    await app.close();
    await rm(dir, { recursive: true, force: true });
  });

  it('alur lengkap: create -> list -> adopt -> conflict -> stats -> delete', async () => {
    const http = () => request(app.getHttpServer());

    await http().post('/cats').send({ name: 'Oyen', breed: 'Domestik', age: 2 }).expect(401);

    const { body: cat } = await http()
      .post('/cats')
      .set('Authorization', alice)
      .send({ name: 'Oyen', breed: 'Domestik', age: 2 })
      .expect(201);
    expect(cat).toMatchObject({ name: 'Oyen', status: 'available', adoptedBy: null });

    const list = await http().get('/cats').expect(200); // publik
    expect(list.body.map((c: { id: string }) => c.id)).toEqual([cat.id]);

    // adopt hanya boleh via session/JWT, Basic ditolak walau kredensial benar
    await http().post(`/cats/${cat.id}/adopt`).set('Authorization', alice).expect(401);

    const agent = request.agent(app.getHttpServer());
    await agent.post('/auth/session/login').send({ username: 'alice', password: 'alice123' }).expect(200);
    const adopted = await agent.post(`/cats/${cat.id}/adopt`).expect(200);
    expect(adopted.body).toMatchObject({ status: 'adopted', adoptedBy: 'alice' });

    const again = await agent.post(`/cats/${cat.id}/adopt`).expect(409); // dari DomainExceptionFilter
    expect(again.body.code).toBe('CONFLICT');

    await http().get('/cats/stats').set('Authorization', bob).expect(401); // stats khusus API key
    const stats = await http().get('/cats/stats').set('x-api-key', DEMO_API_KEY).expect(200);
    expect(stats.body).toEqual({ total: 1, available: 0, adopted: 1, byBreed: { Domestik: 1 } });

    await http().delete(`/cats/${cat.id}`).set('Authorization', alice).expect(403); // bukan admin
    await http().delete(`/cats/${cat.id}`).set('Authorization', bob).expect(204);
    await http().get(`/cats/${cat.id}`).expect(404);
  });

  it('validasi: DTO (400) dan id bukan UUID (400)', async () => {
    const res = await request(app.getHttpServer())
      .post('/cats')
      .set('Authorization', alice)
      .send({ name: 'O', breed: 'Domestik', age: 'dua' })
      .expect(400);
    expect(res.body.message).toEqual(
      expect.arrayContaining([expect.stringMatching(/name/), expect.stringMatching(/age/)]),
    );
    await request(app.getHttpServer()).get('/cats/bukan-uuid').expect(400);
  });
});
