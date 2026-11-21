import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, keylen: number) => Promise<Buffer>;

/** Abstraksi hashing (padanan `PasswordEncoder` di Spring). */
export abstract class PasswordHasher {
  abstract hash(plain: string): Promise<string>;
  abstract verify(plain: string, stored: string): Promise<boolean>;
}

/**
 * scrypt bawaan `node:crypto` (tanpa dependency bcrypt native).
 * - Salt acak per password -> hash sama nggak akan ketemu untuk password sama.
 * - Format disimpan: `scrypt$<salt hex>$<hash hex>`.
 * - `timingSafeEqual` -> waktu pembandingan konstan, mencegah timing attack.
 * - Versi async supaya hashing (sengaja lambat) nggak memblok event loop; jalan di libuv threadpool.
 */
export class ScryptPasswordHasher extends PasswordHasher {
  static readonly KEYLEN = 32;

  async hash(plain: string): Promise<string> {
    const salt = randomBytes(16);
    const key = await scryptAsync(plain, salt, ScryptPasswordHasher.KEYLEN);
    return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
  }

  async verify(plain: string, stored: string): Promise<boolean> {
    const [algo, saltHex, keyHex] = stored.split('$');
    if (algo !== 'scrypt' || !saltHex || !keyHex) return false;
    const expected = Buffer.from(keyHex, 'hex');
    const actual = await scryptAsync(plain, Buffer.from(saltHex, 'hex'), expected.length);
    return timingSafeEqual(actual, expected);
  }
}
