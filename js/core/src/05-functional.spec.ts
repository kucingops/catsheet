import {
  addLine,
  area,
  bulkItem10Percent,
  changeQty,
  cheapestFirst,
  deepFreeze,
  formatReceipt,
  groupBySize,
  minimumSpend,
  naturals,
  parseQty,
  removeLine,
  type Cart,
  type Shape,
  skusInBulk,
  take,
  total,
  totalArea,
} from './05-functional.ts';

const lines = [
  { sku: 'KOPI', qty: 10, price: 10_000 },
  { sku: 'ROTI', qty: 1, price: 20_000 },
];

describe('05 functional', () => {
  it('map / filter / reduce', () => {
    expect(skusInBulk(lines)).toEqual(['KOPI']);
    expect(formatReceipt(lines)).toBe('KOPI x10\nROTI x1\nTOTAL 120000');
  });

  it('aturan diskon = function; tambah promo tanpa ubah total()', () => {
    expect(total(lines)).toBe(120_000);
    expect(total(lines, [minimumSpend(100_000, 15_000)])).toBe(105_000);
    expect(total(lines, [minimumSpend(100_000, 15_000), bulkItem10Percent])).toBe(95_000);
    expect(total(lines, [() => 1_000_000])).toBe(0); // promo inline, nggak perlu bikin class
  });

  it('immutability: update menghasilkan object baru, yang lama utuh', () => {
    const empty: Cart = { owner: 'hilmi', lines: [] };
    const one = addLine(empty, lines[0]!);
    const changed = changeQty(one, 'KOPI', 2);
    const removed = removeLine(changed, 'KOPI');
    expect(empty.lines).toHaveLength(0);
    expect(one.lines[0]!.qty).toBe(10);
    expect(changed.lines[0]!.qty).toBe(2);
    expect(removed.lines).toEqual([]);
  });

  it('Object.freeze itu shallow, deepFreeze sampai dalam', () => {
    const shallow = Object.freeze({ tags: ['a'] });
    shallow.tags.push('b');
    expect(shallow.tags).toEqual(['a', 'b']);

    const deep = deepFreeze({ tags: ['a'] });
    expect(() => (deep.tags as string[]).push('b')).toThrow(TypeError);
  });

  it('toSorted & Object.groupBy tidak mengubah array asli', () => {
    const copy = [...lines].reverse();
    expect(cheapestFirst(copy).map((l) => l.sku)).toEqual(['KOPI', 'ROTI']);
    expect(copy[0]!.sku).toBe('ROTI');
    expect(groupBySize(lines)).toEqual({ bulk: [lines[0]], retail: [lines[1]] });
  });

  it('discriminated union menggantikan hierarki class', () => {
    const shapes: Shape[] = [
      { kind: 'rect', width: 2, height: 3 },
      { kind: 'circle', radius: 1 },
      { kind: 'triangle', base: 4, height: 2 },
    ];
    expect(area(shapes[2]!)).toBe(4);
    expect(totalArea(shapes)).toBeCloseTo(10 + Math.PI);
  });

  it('Result: error yang diharapkan jadi nilai', () => {
    expect(parseQty('3')).toEqual({ ok: true, value: 3 });
    expect(parseQty('0')).toEqual({ ok: false, error: 'qty harus > 0' });
    const r = parseQty('abc');
    if (!r.ok) expect(r.error).toContain('bukan bilangan bulat');
  });

  it('generator: sequence tak hingga tapi lazy', () => {
    expect([...take(naturals(), 3)]).toEqual([1, 2, 3]);
    expect([...take(naturals(), 0)]).toEqual([]);
  });
});
