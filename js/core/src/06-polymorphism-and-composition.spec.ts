import {
  biggest,
  createCat,
  createCatService,
  createInMemoryRepo,
  createTurkishVan,
  type CatRepo,
  shippingCost,
} from './06-polymorphism-and-composition.ts';

describe('06 polymorphism & composition', () => {
  it('duck typing: object apa pun yang punya area() diterima', () => {
    const tanah = { area: () => 100, label: 'tanah' };
    const kamar = { area: () => 12, pemilik: 'hilmi' };
    expect(biggest<{ area(): number }>([kamar, tanah])).toBe(tanah);
  });

  it('lookup table function menggantikan factory + strategy class', () => {
    expect(shippingCost('EXP', 2)).toBe(35_000);
    expect(shippingCost('REG', 2)).toBe(14_000);
    expect(() => shippingCost('XXX', 1)).toThrow('kurir tidak dikenal');
  });

  it('composition: gabung kemampuan, bukan warisi', () => {
    const oyen = createCat('Oyen');
    const van = createTurkishVan('Van');
    expect(oyen.meow()).toBe('Oyen: meong');
    expect('swim' in oyen).toBe(false);
    expect(van.swim()).toBe('Van berenang');
    expect(van.eat('ikan')).toBe('Van makan ikan');
  });

  it('DI = oper dependency sebagai parameter', () => {
    const log = vi.fn();
    const svc = createCatService({
      repo: createInMemoryRepo([{ id: '1', name: 'Oyen' }]),
      now: () => new Date('2026-11-21T00:00:00Z'),
      log,
    });
    expect(svc.rename('1', '  Oyen Gendut ')).toEqual({ id: '1', name: 'Oyen Gendut' });
    expect(log).toHaveBeenCalledWith('[2026-11-21T00:00:00.000Z] rename 1 -> Oyen Gendut');
  });

  it('mock cukup object literal + vi.fn(), tanpa framework mocking', () => {
    const repo: CatRepo = { findById: vi.fn(() => undefined), save: vi.fn() };
    const svc = createCatService({ repo });
    expect(() => svc.rename('x', 'y')).toThrow('kucing x tidak ada');
    expect(repo.save).not.toHaveBeenCalled();
  });
});
