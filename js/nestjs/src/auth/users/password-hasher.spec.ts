import { ScryptPasswordHasher } from './password-hasher.js';

describe('ScryptPasswordHasher', () => {
  const hasher = new ScryptPasswordHasher();

  it('hash beda tiap kali (salt acak) tapi tetap bisa diverifikasi', async () => {
    const a = await hasher.hash('rahasia');
    const b = await hasher.hash('rahasia');
    expect(a).not.toBe(b);
    expect(a).toMatch(/^scrypt\$[0-9a-f]{32}\$[0-9a-f]{64}$/);
    expect(await hasher.verify('rahasia', a)).toBe(true);
    expect(await hasher.verify('salah', a)).toBe(false);
  });

  it('format hash rusak -> false, bukan crash', async () => {
    expect(await hasher.verify('x', 'md5$abc')).toBe(false);
    expect(await hasher.verify('x', '')).toBe(false);
  });
});
