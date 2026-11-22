import {
  capitalize,
  DomainError,
  LruCache,
  NotFoundError,
  StringUtils,
  Thermostat,
  toHttpStatus,
} from './09-classes-when-idiomatic.ts';

describe('09 class yang idiomatis', () => {
  it('custom error: instanceof, name, code, cause', () => {
    const root = new Error('koneksi putus');
    const err = new DomainError('DB', 'gagal simpan', { cause: root });
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('DomainError');
    expect(err.cause).toBe(root);
    expect(toHttpStatus(new NotFoundError('kucing', '7'))).toBe(404);
    expect(toHttpStatus(err)).toBe(422);
    expect(toHttpStatus(new TypeError())).toBe(500);
    expect(new NotFoundError('kucing', '7').message).toBe('kucing 7 tidak ditemukan');
  });

  it('LRU cache: buang yang paling lama tidak dipakai', () => {
    const lru = new LruCache<string, number>(2).set('a', 1).set('b', 2);
    lru.get('a'); // a jadi paling baru
    lru.set('c', 3); // b terbuang
    expect(lru.keys()).toEqual(['a', 'c']);
    expect(lru.get('b')).toBeUndefined();
    expect([...lru]).toEqual([
      ['a', 1],
      ['c', 3],
    ]);
    expect(() => new LruCache(0)).toThrow(RangeError);
  });

  it('#private: tidak bocor dan bisa brand check', () => {
    const lru = new LruCache(1);
    expect(Object.keys(lru)).toEqual([]);
    expect(JSON.stringify(lru)).toBe('{}');
    expect(LruCache.isLruCache(lru)).toBe(true);
    expect(LruCache.isLruCache({ size: 0 })).toBe(false);
  });

  it('method class dibagi lewat prototype (hemat untuk banyak instance)', () => {
    expect(new LruCache(1).get).toBe(new LruCache(2).get);
  });

  it('extend EventTarget', () => {
    const t = new Thermostat();
    const seen: number[] = [];
    t.addEventListener('change', (e) => seen.push((e as CustomEvent<number>).detail));
    t.celsius = 25;
    t.celsius = 25; // sama, tidak emit
    expect(seen).toEqual([25]);
  });

  it('static utility class vs function biasa: hasil sama, function lebih ringkas', () => {
    expect(StringUtils.capitalize('oyen')).toBe(capitalize('oyen'));
  });
});
