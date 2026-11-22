import { createParamDecorator, type ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Request } from 'express';
import { ALL_AUTH_METHODS, type AuthMethod, type Principal, type Role } from './principal.js';

export const AUTH_METHODS_KEY = 'auth:methods';
export const ROLES_KEY = 'auth:roles';

/**
 * `@Auth()`                 -> wajib login, jalur apa saja
 * `@Auth('session', 'jwt')` -> hanya boleh lewat jalur itu
 * Route tanpa @Auth = publik.
 * Mirip `securityMatcher` + SecurityFilterChain berbeda per path di Spring, tapi per-handler.
 */
export const Auth = (...methods: AuthMethod[]) =>
  SetMetadata(AUTH_METHODS_KEY, methods.length ? methods : ALL_AUTH_METHODS);

/** `@Roles('admin')` -> padanan @PreAuthorize("hasRole('ADMIN')"). Otomatis butuh login. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

/** Ambil principal di parameter handler: `me(@CurrentUser() user: Principal)` (padanan @AuthenticationPrincipal). */
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): Principal | undefined => ctx.switchToHttp().getRequest<Request>().user,
);

declare module 'express-serve-static-core' {
  interface Request {
    user?: Principal;
  }
}
