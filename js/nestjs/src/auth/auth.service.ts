import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Role } from './principal.js';
import { PasswordHasher } from './users/password-hasher.js';
import { type UserAccount, UserStore } from './users/user.store.js';

export interface JwtPayload {
  sub: string;
  username: string;
  roles: Role[];
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UserStore,
    private readonly hasher: PasswordHasher,
    private readonly jwt: JwtService,
  ) {}

  /**
   * Cek username + password. Return undefined (bukan throw) kalau gagal,
   * dan pesan error ke client dibuat SAMA untuk "user tidak ada" vs "password salah"
   * supaya penyerang nggak bisa menebak username mana yang valid (user enumeration).
   */
  async validateCredentials(username: string, password: string): Promise<UserAccount | undefined> {
    const user = this.users.findByUsername(username);
    if (!user) return undefined;
    return (await this.hasher.verify(password, user.passwordHash)) ? user : undefined;
  }

  issueToken(user: UserAccount): Promise<string> {
    const payload: JwtPayload = { sub: user.id, username: user.username, roles: user.roles };
    return this.jwt.signAsync(payload);
  }
}
