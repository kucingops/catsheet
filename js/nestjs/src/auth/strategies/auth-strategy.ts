import type { Request } from 'express';
import type { AuthMethod, Principal } from '../principal.js';

/**
 * STRATEGY PATTERN untuk autentikasi.
 * Tiap jalur login (session, JWT, Basic, API key) = satu subclass.
 * AuthGuard nggak tahu detailnya; dia cuma loop strategi yang diizinkan route dan pakai yang pertama berhasil.
 *
 * Padanan di Spring Security: AuthenticationProvider / filter per mekanisme
 * (UsernamePasswordAuthenticationFilter, BearerTokenAuthenticationFilter, BasicAuthenticationFilter, ...).
 *
 * Kontrak:
 *   - return Principal  -> berhasil
 *   - return null       -> "bukan urusan saya" (header/cookie yang saya cari nggak ada) -> coba strategi lain
 *   - throw             -> kredensial ADA tapi salah/kedaluwarsa -> langsung 401
 */
export abstract class AuthStrategy {
  abstract readonly method: AuthMethod;
  abstract authenticate(req: Request): Promise<Principal | null>;
}
