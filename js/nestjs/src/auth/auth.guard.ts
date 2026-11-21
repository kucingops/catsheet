import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AUTH_METHODS_KEY, ROLES_KEY } from './decorators.js';
import { ALL_AUTH_METHODS, type AuthMethod, type Role } from './principal.js';
import { AuthStrategy } from './strategies/auth-strategy.js';

/** Token untuk "list semua AuthStrategy" (padanan inject `List<AuthenticationProvider>` di Spring). */
export const AUTH_STRATEGIES = Symbol('AUTH_STRATEGIES');

/**
 * Satu guard global, dua tahap (persis urutan Spring Security):
 *   1. AUTHENTICATION  (siapa kamu?)        -> gagal = 401
 *   2. AUTHORIZATION   (boleh ngapain?)     -> gagal = 403
 *
 * Guard ini nggak punya `if (method === 'jwt') ... else if ...`. Dia cuma iterasi strategi (polymorphism),
 * jadi tambah jalur login baru = tambah class strategy, guard nggak diubah (Open/Closed).
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(AUTH_STRATEGIES) private readonly strategies: readonly AuthStrategy[],
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const targets = [ctx.getHandler(), ctx.getClass()];
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, targets);
    let methods = this.reflector.getAllAndOverride<AuthMethod[] | undefined>(AUTH_METHODS_KEY, targets);
    if (!methods && roles?.length) methods = [...ALL_AUTH_METHODS]; // @Roles tanpa @Auth tetap butuh login
    if (!methods) return true; // route publik

    const req = ctx.switchToHttp().getRequest<Request>();
    for (const strategy of this.strategies) {
      if (!methods.includes(strategy.method)) continue;
      const principal = await strategy.authenticate(req);
      if (principal) {
        req.user = principal;
        break;
      }
    }

    if (!req.user) throw new UnauthorizedException(`butuh login via: ${methods.join(', ')}`);
    if (roles?.length && !roles.some((r) => req.user!.roles.includes(r))) {
      throw new ForbiddenException(`butuh role: ${roles.join(' / ')}`);
    }
    return true;
  }
}
