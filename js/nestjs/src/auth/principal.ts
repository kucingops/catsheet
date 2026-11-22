export type Role = 'user' | 'admin' | 'service';
export type AuthMethod = 'session' | 'jwt' | 'basic' | 'api-key';
export const ALL_AUTH_METHODS: readonly AuthMethod[] = ['session', 'jwt', 'basic', 'api-key'];

/**
 * Siapa yang sedang request. Dipasang di `req.user` oleh AuthGuard.
 * Padanan `Authentication`/`Principal` di Spring Security.
 */
export interface Principal {
  id: string;
  username: string;
  roles: readonly Role[];
  /** lewat jalur login mana dia masuk */
  via: AuthMethod;
}
