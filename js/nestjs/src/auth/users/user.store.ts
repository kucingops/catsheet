import { createHash } from 'node:crypto';
import { Injectable, type OnModuleInit } from '@nestjs/common';
import type { Role } from '../principal.js';
import { PasswordHasher } from './password-hasher.js';

export interface UserAccount {
  id: string;
  username: string;
  passwordHash: string;
  roles: Role[];
}

export interface ApiClient {
  id: string;
  name: string;
  roles: Role[];
}

/** Akun demo. Di aplikasi beneran: tabel users + secret dari vault/env, bukan hardcode. */
export const DEMO_USERS = [
  { id: 'u-1', username: 'alice', password: 'alice123', roles: ['user'] },
  { id: 'u-2', username: 'bob', password: 'bob123', roles: ['user', 'admin'] },
] as const satisfies ReadonlyArray<{ id: string; username: string; password: string; roles: Role[] }>;

export const DEMO_API_KEY = 'demo-api-key-123';

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

/**
 * Penyimpanan user & API client (in-memory, biar fokus ke security, bukan DB).
 * API key disimpan dalam bentuk HASH (sha256), sama seperti password: kalau storage bocor,
 * key aslinya tetap nggak ketahuan. sha256 cukup karena API key itu acak panjang (bukan password manusia).
 */
@Injectable()
export class UserStore implements OnModuleInit {
  readonly #users = new Map<string, UserAccount>();
  readonly #apiClients = new Map<string, ApiClient>(); // key = sha256(apiKey)

  constructor(private readonly hasher: PasswordHasher) {}

  /** Lifecycle hook (padanan @PostConstruct). Hash password demo saat module siap. */
  async onModuleInit(): Promise<void> {
    for (const u of DEMO_USERS) {
      this.#users.set(u.username, {
        id: u.id,
        username: u.username,
        passwordHash: await this.hasher.hash(u.password),
        roles: [...u.roles],
      });
    }
    this.#apiClients.set(sha256(process.env.DEMO_API_KEY ?? DEMO_API_KEY), {
      id: 'svc-1',
      name: 'reporting-bot',
      roles: ['service'],
    });
  }

  findByUsername(username: string): UserAccount | undefined {
    return this.#users.get(username);
  }

  findById(id: string): UserAccount | undefined {
    return [...this.#users.values()].find((u) => u.id === id);
  }

  findApiClient(apiKey: string): ApiClient | undefined {
    return this.#apiClients.get(sha256(apiKey));
  }
}
