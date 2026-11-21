import {
  BadSquare,
  BulkItemDiscount,
  GreetingService,
  MinimumSpendDiscount,
  MutableRectangle,
  OrderCalculator,
  PriceEngine,
  ReceiptFormatter,
  ReportService,
  stretch,
} from './06-solid.ts';

const lines = [
  { sku: 'KOPI', qty: 10, price: 10_000 },
  { sku: 'ROTI', qty: 1, price: 20_000 },
];

describe('06 SOLID', () => {
  it('S: hitung dan format dipisah', () => {
    const subtotal = new OrderCalculator().subtotal(lines);
    expect(subtotal).toBe(120_000);
    expect(new ReceiptFormatter().format(lines, subtotal)).toBe('KOPI x10\nROTI x1\nTOTAL 120000');
  });

  it('O: tambah aturan diskon tanpa ubah PriceEngine', () => {
    expect(new PriceEngine([]).total(lines)).toBe(120_000);
    expect(new PriceEngine([new MinimumSpendDiscount(100_000, 15_000)]).total(lines)).toBe(105_000);
    expect(new PriceEngine([new MinimumSpendDiscount(100_000, 15_000), new BulkItemDiscount()]).total(lines)).toBe(
      95_000,
    );
  });

  it('L: BadSquare melanggar ekspektasi caller', () => {
    expect(stretch(new MutableRectangle())).toBe(20);
    expect(stretch(new BadSquare())).toBe(16); // kejutan! inilah pelanggaran LSP
  });

  it('I: ReportService cukup dikasih object yang punya findById', () => {
    const svc = new ReportService({ findById: (id) => ({ id, total: 42 }) });
    expect(svc.totalOf('x')).toBe(42);
  });

  it('D: Clock di-inject, jadi test bisa atur waktu', () => {
    const at = (iso: string) => new GreetingService({ now: () => new Date(iso) });
    expect(at('2026-11-21T07:00:00Z').greet('Hilmi')).toBe('Selamat pagi, Hilmi');
    expect(at('2026-11-21T20:00:00Z').greet('Hilmi')).toBe('Selamat malam, Hilmi');
  });

  it('D (alternatif): fake timers vitest kalau kode terlanjur pakai new Date()', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-21T12:00:00Z'));
    expect(new GreetingService().greet('Hilmi')).toBe('Selamat siang, Hilmi');
    vi.useRealTimers();
  });
});
