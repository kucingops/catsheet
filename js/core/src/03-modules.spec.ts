import describeStore, * as store from './03-modules.ts';

describe('03 modules', () => {
  beforeEach(() => store.resetCats());

  it('hanya yang di-export yang bisa diakses', () => {
    expect(Object.keys(store)).toContain('addCat');
    expect(Object.keys(store)).not.toContain('cats');
    expect(Object.keys(store)).not.toContain('normalize');
  });

  it('state module dipakai bersama semua importer', () => {
    store.addCat('  Oyen   Gendut ');
    expect(store.countCats()).toBe(1);
    expect(store.findCat('cat-1')?.name).toBe('Oyen Gendut');
    expect(describeStore()).toBe('catsheet: 1 kucing');
  });

  it('module di-cache: import kedua dapat instance yang sama (singleton gratis)', async () => {
    const again = await import('./03-modules.ts');
    expect(again.config).toBe(store.config);
    store.addCat('Mochi');
    expect(again.countCats()).toBe(1);
  });

  it('export const yang di-freeze tidak bisa diubah', () => {
    expect(() => {
      (store.config as { maxCats: number }).maxCats = 10;
    }).toThrow(TypeError);
  });

  it('dynamic import untuk dependency opsional', async () => {
    const path = await store.loadOptional<typeof import('node:path')>('node:path');
    expect(path?.join('a', 'b')).toBe('a/b');
    expect(await store.loadOptional('paket-yang-tidak-ada')).toBeUndefined();
  });
});
