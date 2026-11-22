import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { JwtPayload } from '../auth.service.js';
import type { Principal } from '../principal.js';
import { AuthStrategy } from './auth-strategy.js';

/**
 * STATELESS: semua info ada di token yang ditandatangani (HS256 + secret).
 * Server cuma verifikasi signature & `exp`, nggak lookup DB. Mirip oauth2ResourceServer().jwt() di Spring.
 *
 * + Gampang di-scale, cocok untuk API/mobile/microservice.
 * - Token nggak bisa di-revoke sebelum expired (kecuali pakai denylist) -> umur access token dibuat pendek,
 *   plus refresh token. Role di dalam token bisa basi kalau role user diubah.
 */
@Injectable()
export class JwtStrategy extends AuthStrategy {
  readonly method = 'jwt' as const;

  constructor(private readonly jwt: JwtService) {
    super();
  }

  async authenticate(req: Request): Promise<Principal | null> {
    const [scheme, token] = (req.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) return null;
    try {
      const p = await this.jwt.verifyAsync<JwtPayload>(token);
      return { id: p.sub, username: p.username, roles: p.roles, via: this.method };
    } catch {
      throw new UnauthorizedException('token tidak valid atau kedaluwarsa');
    }
  }
}
