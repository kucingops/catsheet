import { add, applyDiscount, counted, greet, partOfDay, percentOf, pipe, sum, tax11, twice } from './01-functions.ts';

describe('01 functions', () => {
  it('function adalah value: bisa disimpan dan dioper', () => {
    const ops = { add, mul: (a: number, b: number) => a * b };
    expect([1, 2, 3].reduce(ops.add, 0)).toBe(6);
    expect(ops.mul(3, 4)).toBe(12);
  });

  it('options object + default menggantikan overloading', () => {
    expect(greet('Hilmi')).toBe('Halo, Hilmi');
    expect(greet('Hilmi', { greeting: 'Pagi' })).toBe('Pagi, Hilmi');
    expect(greet('Hilmi', { shout: true })).toBe('HALO, HILMI');
  });

  it('rest param', () => {
    expect(sum()).toBe(0);
    expect(sum(1, 2, 3)).toBe(6);
  });

  it('higher-order & currying', () => {
    expect(twice((x: number) => x + 3)(1)).toBe(7);
    expect(tax11(100_000)).toBeCloseTo(11_000);
    expect([100, 200].map(percentOf(0.5))).toEqual([50, 100]);
  });

  it('pipe merangkai function kecil', () => {
    const normalize = pipe<string>(
      (s) => s.trim(),
      (s) => s.toLowerCase(),
      (s) => s.replaceAll(/\s+/g, '-'),
    );
    expect(normalize('  Kucing Oren  ')).toBe('kucing-oren');
  });

  it('pure function: input sama, output sama', () => {
    expect(applyDiscount(100, 0.1)).toBe(applyDiscount(100, 0.1));
  });

  it('dependency waktu cukup jadi parameter, nggak perlu Clock interface', () => {
    expect(partOfDay(new Date('2026-11-21T07:00:00Z'))).toBe('pagi');
    expect(partOfDay(new Date('2026-11-21T20:00:00Z'))).toBe('malam');
  });

  it('function juga object: bisa punya property', () => {
    const f = counted((x: number) => x * 2);
    f(1);
    f(2);
    expect(f.calls).toBe(2);
  });
});
