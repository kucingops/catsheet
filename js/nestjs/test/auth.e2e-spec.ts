import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { DEMO_API_KEY } from '../src/auth/users/user.store.js';
import { basic, createApp } from './helpers.js';

/** E2E: app utuh (guard, pipe, filter, session middleware) lewat HTTP sungguhan (supertest). */
describe('Multiple login (e2e)', () => {
  let app: INestApplication<App>;
  beforeAll(async () => {
    app = await createApp();
  });
  afterAll(() => app.close());

  it('tanpa kredensial -> 401', () => request(app.getHttpServer()).get('/auth/me').expect(401));

  describe('1. session + cookie', () => {
    it('login -> cookie sid -> /auth/me -> logout -> 401 lagi', async () => {
      const agent = request.agent(app.getHttpServer()); // agent menyimpan cookie seperti browser

      const login = await agent.post('/auth/session/login').send({ username: 'alice', password: 'alice123' });
      expect(login.status).toBe(200);
      expect(login.headers['set-cookie']?.[0]).toMatch(/^sid=.*HttpOnly/);

      const me = await agent.get('/auth/me').expect(200);
      expect(me.body).toMatchObject({ username: 'alice', via: 'session' });

      await agent.post('/auth/session/logout').expect(204);
      await agent.get('/auth/me').expect(401);
    });

    it('password salah -> 401, tidak ada cookie', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/session/login')
        .send({ username: 'alice', password: 'x' })
        .expect(401);
      expect(res.headers['set-cookie']).toBeUndefined();
    });
  });

  describe('2. JWT bearer', () => {
    it('tukar password dengan token, lalu pakai token', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/auth/jwt/login')
        .send({ username: 'bob', password: 'bob123' })
        .expect(200);
      expect(body.tokenType).toBe('Bearer');

      const me = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${body.accessToken}`)
        .expect(200);
      expect(me.body).toMatchObject({ username: 'bob', roles: ['user', 'admin'], via: 'jwt' });
    });

    it('token rusak -> 401', () =>
      request(app.getHttpServer()).get('/auth/me').set('Authorization', 'Bearer ngawur').expect(401));
  });

  describe('3. HTTP Basic', () => {
    it('benar -> 200, salah -> 401', async () => {
      const ok = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', basic('alice', 'alice123'))
        .expect(200);
      expect(ok.body.via).toBe('basic');
      await request(app.getHttpServer()).get('/auth/me').set('Authorization', basic('alice', 'x')).expect(401);
    });
  });

  describe('4. API key', () => {
    it('benar -> 200 sebagai service account', async () => {
      const res = await request(app.getHttpServer()).get('/auth/me').set('x-api-key', DEMO_API_KEY).expect(200);
      expect(res.body).toMatchObject({ username: 'reporting-bot', roles: ['service'], via: 'api-key' });
    });
  });

  describe('validasi body login', () => {
    it('field kurang / field asing -> 400', async () => {
      await request(app.getHttpServer()).post('/auth/jwt/login').send({ username: 'a' }).expect(400);
      await request(app.getHttpServer())
        .post('/auth/jwt/login')
        .send({ username: 'a', password: 'b', isAdmin: true })
        .expect(400);
    });
  });
});
