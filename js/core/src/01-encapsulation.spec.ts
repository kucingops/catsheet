import { BankAccount, InsufficientFundsError, SoftPrivate } from './01-encapsulation.ts';

describe('01 encapsulation', () => {
  it('validasi lewat static factory', () => {
    expect(() => BankAccount.open('  ')).toThrow('owner wajib diisi');
    expect(() => BankAccount.open('hilmi', -1)).toThrow();
  });

  it('state hanya berubah lewat method yang menjaga invariant', () => {
    const acc = BankAccount.open('hilmi', 100);
    acc.deposit(50);
    acc.withdraw(30);
    expect(acc.balance).toBe(120);
    expect(() => acc.withdraw(1_000)).toThrow(InsufficientFundsError);
    expect(() => acc.deposit(-5)).toThrow(RangeError);
    expect(acc.balance).toBe(120); // gagal = state tidak berubah
  });

  it('getter tanpa setter = read-only; history dikembalikan sebagai copy', () => {
    const acc = BankAccount.open('hilmi', 10);
    // @ts-expect-error -- balance tidak punya setter
    expect(() => (acc.balance = 999)).toThrow(TypeError); // ESM = strict mode -> throw
    (acc.history as string[]).push('hack');
    expect(acc.history).toEqual([]);
  });

  it('#field benar-benar private di runtime, `private` TS tidak', () => {
    const acc = BankAccount.open('hilmi', 10);
    expect(Object.keys(acc)).toEqual(['owner']);
    expect((acc as any)['#balance']).toBeUndefined();
    expect(JSON.stringify(acc)).toBe('{"owner":"hilmi","balance":10}');

    const soft = new SoftPrivate();
    expect((soft as any).secret).toBe('bukan rahasia beneran');
  });

  it('brand check dengan `#field in obj`', () => {
    expect(BankAccount.isAccount(BankAccount.open('a'))).toBe(true);
    expect(BankAccount.isAccount({ owner: 'palsu', balance: 1 })).toBe(false);
  });
});
