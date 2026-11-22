import { type ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AuthGuard } from './auth.guard.js';
import { Auth, Roles } from './decorators.js';
import type { AuthMethod, Principal } from './principal.js';
import { AuthStrategy } from './strategies/auth-strategy.js';

/** Strategy palsu: mengembalikan principal yang sudah ditentukan. */
class StubStrategy extends AuthStrategy {
  calls = 0;
  constructor(
    readonly method: AuthMethod,
    private readonly result: Principal | null,
  ) {
    super();
  }
  async authenticate(): Promise<Principal | null> {
    this.calls++;
    return this.result;
  }
}

const alice: Principal = { id: 'u-1', username: 'alice', roles: ['user'], via: 'jwt' };

// Handler & class dummy yang ditempeli decorator, persis seperti di controller asli.
class Demo {
  publicRoute() {}
  @Auth() anyLogin() {}
  @Auth('session') sessionOnly() {}
  @Roles('admin') adminOnly() {}
}

function ctxFor(handler: keyof Demo, req: Partial<Request> = {}): ExecutionContext {
  return {
    getHandler: () => Demo.prototype[handler],
    getClass: () => Demo,
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

describe('AuthGuard', () => {
  const guardWith = (...strategies: AuthStrategy[]) => new AuthGuard(new Reflector(), strategies);

  it('route tanpa @Auth = publik, strategi tidak dipanggil', async () => {
    const jwt = new StubStrategy('jwt', null);
    expect(await guardWith(jwt).canActivate(ctxFor('publicRoute'))).toBe(true);
    expect(jwt.calls).toBe(0);
  });

  it('@Auth(): strategi pertama yang berhasil dipakai & principal dipasang di req.user', async () => {
    const req: Partial<Request> = {};
    const session = new StubStrategy('session', null);
    const jwt = new StubStrategy('jwt', alice);
    const basic = new StubStrategy('basic', alice);
    await guardWith(session, jwt, basic).canActivate(ctxFor('anyLogin', req));
    expect(req.user).toBe(alice);
    expect([session.calls, jwt.calls, basic.calls]).toEqual([1, 1, 0]); // berhenti setelah jwt berhasil
  });

  it('semua strategi null -> 401', async () => {
    await expect(guardWith(new StubStrategy('jwt', null)).canActivate(ctxFor('anyLogin'))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('@Auth("session") mengabaikan strategi lain walau valid', async () => {
    const jwt = new StubStrategy('jwt', alice);
    await expect(guardWith(jwt).canActivate(ctxFor('sessionOnly'))).rejects.toThrow(UnauthorizedException);
    expect(jwt.calls).toBe(0);
  });

  it('@Roles("admin"): login tapi bukan admin -> 403; admin -> lolos', async () => {
    await expect(guardWith(new StubStrategy('jwt', alice)).canActivate(ctxFor('adminOnly'))).rejects.toThrow(
      ForbiddenException,
    );
    const bob: Principal = { ...alice, username: 'bob', roles: ['user', 'admin'] };
    expect(await guardWith(new StubStrategy('basic', bob)).canActivate(ctxFor('adminOnly'))).toBe(true);
  });

  it('@Roles tanpa login -> 401, bukan 403', async () => {
    await expect(guardWith(new StubStrategy('jwt', null)).canActivate(ctxFor('adminOnly'))).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
