import {
  BankTransferProcessor,
  EWalletProcessor,
  InMemoryNotifier,
  type Notifier,
  PaymentProcessor,
} from './04-abstraction.ts';

describe('04 abstraction', () => {
  it('template method: alur sama, detail beda per subclass', () => {
    const notifier = new InMemoryNotifier();
    const processors: PaymentProcessor[] = [new BankTransferProcessor(notifier), new EWalletProcessor(notifier)];

    const results = processors.map((p) => p.pay(100_000));

    expect(results).toEqual([
      { ok: true, reference: 'BT-1', fee: 2_500 },
      { ok: true, reference: 'EW-101000', fee: 1_000 },
    ]);
    expect(notifier.messages).toHaveLength(2);
    expect(notifier.messages[0]).toContain('[bank-transfer]');
  });

  it('dependency berupa interface bisa diganti mock (vi.fn)', () => {
    const notify = vi.fn();
    const notifier: Notifier = { notify };
    new EWalletProcessor(notifier).pay(500);
    expect(notify).toHaveBeenCalledOnce();
    expect(notify).toHaveBeenCalledWith(expect.stringContaining('e-wallet'));
  });

  it('validasi di parent berlaku untuk semua subclass', () => {
    expect(() => new BankTransferProcessor(new InMemoryNotifier()).pay(0)).toThrow(RangeError);
  });

  it('abstract class ada di runtime, interface tidak', () => {
    expect(typeof PaymentProcessor).toBe('function');
    // `Notifier` cuma tipe; baris berikut akan error compile kalau dibuka komentarnya:
    // typeof Notifier
  });
});
