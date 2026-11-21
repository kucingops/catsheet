import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import type { Principal } from '../principal.js';
import { UserStore } from '../users/user.store.js';
import { AuthStrategy } from './auth-strategy.js';

/**
 * API KEY: header `x-api-key`. Identitasnya MESIN (service/bot), bukan manusia.
 * Biasanya dikasih role terbatas & bisa di-rotate per client. Spring nggak punya bawaan,
 * biasanya bikin custom filter (OncePerRequestFilter), persis seperti class ini.
 */
@Injectable()
export class ApiKeyStrategy extends AuthStrategy {
  static readonly HEADER = 'x-api-key';
  readonly method = 'api-key' as const;

  constructor(private readonly users: UserStore) {
    super();
  }

  async authenticate(req: Request): Promise<Principal | null> {
    const key = req.header(ApiKeyStrategy.HEADER);
    if (!key) return null;
    const client = this.users.findApiClient(key);
    if (!client) throw new UnauthorizedException('API key tidak dikenal');
    return { id: client.id, username: client.name, roles: client.roles, via: this.method };
  }
}
