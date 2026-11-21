import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { AuthService } from '../auth.service.js';
import { ScryptPasswordHasher } from '../users/password-hasher.js';
import { DEMO_API_KEY, UserStore } from '../users/user.store.js';
import { ApiKeyStrategy } from './api-key.strategy.js';
import { BasicStrategy } from './basic.strategy.js';
import { JwtStrategy } from './jwt.strategy.js';
import { SessionStrategy } from './session.strategy.js';

/** Request palsu secukupnya. Strategi cuma baca header & session, jadi nggak perlu server HTTP. */
function fakeReq(headers: Record<string, string> = {}, session: Record<string, unknown> = {}): Request {
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return { headers: lower, header: (n: string) => lower[n.toLowerCase()], session } as unknown as Request;
}
const basic = (u: string, p: string) => `Basic ${Buffer.from(`${u}:${p}`).toString('base64')}`;

describe('Auth strategies (unit, tanpa Nest container)', () => {
  let users: UserStore;
  let jwt: JwtService;
  let auth: AuthService;

  beforeAll(async () => {
    const hasher = new ScryptPasswordHasher();
    users = new UserStore(hasher);
    await users.onModuleInit();
    jwt = new JwtService({ secret: 'test-secret', signOptions: { expiresIn: '1m' } });
    auth = new AuthService(users, hasher, jwt);
  });

  describe('SessionStrategy', () => {
    it('null kalau belum ada sesi; principal kalau session.userId ada', async () => {
      const s = new SessionStrategy(users);
      expect(await s.authenticate(fakeReq())).toBeNull();
      expect(await s.authenticate(fakeReq({}, { userId: 'u-1' }))).toMatchObject({
        username: 'alice',
        via: 'session',
      });
    });
  });

  describe('JwtStrategy', () => {
    it('token valid -> principal dari klaim token', async () => {
      const token = await auth.issueToken(users.findByUsername('bob')!);
      const p = await new JwtStrategy(jwt).authenticate(fakeReq({ authorization: `Bearer ${token}` }));
      expect(p).toEqual({ id: 'u-2', username: 'bob', roles: ['user', 'admin'], via: 'jwt' });
    });

    it('bukan Bearer -> null (biar strategi lain mencoba)', async () => {
      expect(await new JwtStrategy(jwt).authenticate(fakeReq({ authorization: basic('a', 'b') }))).toBeNull();
    });

    it('token palsu / beda secret / expired -> 401', async () => {
      const forged = await new JwtService({ secret: 'secret-lain' }).signAsync({ sub: 'u-2' });
      const expired = await jwt.signAsync({ sub: 'u-1' }, { expiresIn: -10 });
      const s = new JwtStrategy(jwt);
      for (const t of ['abc.def.ghi', forged, expired]) {
        await expect(s.authenticate(fakeReq({ authorization: `Bearer ${t}` }))).rejects.toThrow(UnauthorizedException);
      }
    });
  });

  describe('BasicStrategy', () => {
    it('kredensial benar / salah', async () => {
      const s = new BasicStrategy(auth);
      expect(await s.authenticate(fakeReq({ authorization: basic('alice', 'alice123') }))).toMatchObject({
        username: 'alice',
        via: 'basic',
      });
      await expect(s.authenticate(fakeReq({ authorization: basic('alice', 'salah') }))).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(s.authenticate(fakeReq({ authorization: basic('ghost', 'x') }))).rejects.toThrow(
        'username atau password salah', // pesan sama -> tidak bocor username mana yang ada
      );
    });
  });

  describe('ApiKeyStrategy', () => {
    it('key benar -> principal service; key salah -> 401; tanpa header -> null', async () => {
      const s = new ApiKeyStrategy(users);
      expect(await s.authenticate(fakeReq({ 'x-api-key': DEMO_API_KEY }))).toMatchObject({
        username: 'reporting-bot',
        roles: ['service'],
        via: 'api-key',
      });
      await expect(s.authenticate(fakeReq({ 'x-api-key': 'ngawur' }))).rejects.toThrow(UnauthorizedException);
      expect(await s.authenticate(fakeReq())).toBeNull();
    });
  });
});
