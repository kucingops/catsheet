import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import type { Principal } from '../principal.js';
import { UserStore } from '../users/user.store.js';
import { AuthStrategy } from './auth-strategy.js';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}

/**
 * STATEFUL: server menyimpan sesi (di sini MemoryStore express-session; production pakai Redis).
 * Browser cuma pegang cookie `sid` (httpOnly). Mirip form login + HttpSession di Spring.
 *
 * + Logout/revoke gampang (hapus sesi di server).
 * - Butuh shared store kalau app di-scale horizontal; rawan CSRF kalau cookie dipakai lintas situs
 *   (mitigasi: SameSite cookie + CSRF token).
 */
@Injectable()
export class SessionStrategy extends AuthStrategy {
  readonly method = 'session' as const;

  constructor(private readonly users: UserStore) {
    super();
  }

  async authenticate(req: Request): Promise<Principal | null> {
    const userId = req.session?.userId;
    if (!userId) return null;
    const user = this.users.findById(userId);
    if (!user) return null; // user dihapus setelah login -> anggap belum login
    return { id: user.id, username: user.username, roles: user.roles, via: this.method };
  }
}
