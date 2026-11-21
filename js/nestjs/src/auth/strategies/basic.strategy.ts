import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from '../auth.service.js';
import type { Principal } from '../principal.js';
import { AuthStrategy } from './auth-strategy.js';

/**
 * HTTP BASIC: `Authorization: Basic base64(username:password)` di SETIAP request.
 * Base64 itu encoding, BUKAN enkripsi -> wajib HTTPS.
 * Cocok untuk tool internal / server-to-server sederhana. Mirip httpBasic() di Spring.
 * Minus: password dikirim & di-hash ulang tiap request (scrypt itu sengaja lambat).
 */
@Injectable()
export class BasicStrategy extends AuthStrategy {
  readonly method = 'basic' as const;

  constructor(private readonly auth: AuthService) {
    super();
  }

  async authenticate(req: Request): Promise<Principal | null> {
    const [scheme, encoded] = (req.headers.authorization ?? '').split(' ');
    if (scheme !== 'Basic' || !encoded) return null;
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    const sep = decoded.indexOf(':'); // password boleh mengandung ':', jadi split di ':' pertama saja
    if (sep < 0) throw new UnauthorizedException('format Basic auth salah');
    const user = await this.auth.validateCredentials(decoded.slice(0, sep), decoded.slice(sep + 1));
    if (!user) throw new UnauthorizedException('username atau password salah');
    return { id: user.id, username: user.username, roles: user.roles, via: this.method };
  }
}
