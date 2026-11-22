import {
  createAccount,
  idGenerator,
  InsufficientFundsError,
  loopWithLet,
  loopWithVar,
  memoize,
  once,
} from './02-closures.ts';

describe('02 closures', () => {
  it('factory function memvalidasi input', () => {
    expect(() => createAccount('  ')).toThrow('owner wajib diisi');
    expect(() => createAccount('hilmi', -1)).toThrow(RangeError);
  });

  it('state hanya berubah lewat function yang menjaga invariant', () => {
    const acc = createAccount('hilmi', 100);
    acc.deposit(50);
    acc.withdraw(30);
    expect(acc.balance).toBe(120);
    expect(() => acc.withdraw(1_000)).toThrow(InsufficientFundsError);
    expect(() => acc.deposit(-5)).toThrow(RangeError);
    expect(acc.balance).toBe(120);
  });

  it('variabel closure benar-benar privat', () => {
    const acc = createAccount('hilmi', 10);
    expect(Object.keys(acc)).not.toContain('assertPositive'); // helper internal tidak terekspos
    expect(JSON.stringify(acc)).toBe('{"owner":"hilmi","balance":10}');
    // @ts-expect-error -- balance cuma getter
    expect(() => (acc.balance = 999)).toThrow(TypeError);
    acc.history().push('hack');
    expect(acc.history()).toEqual([]);
  });

  it('method dari closure aman dioper sebagai callback (nggak ada `this`)', () => {
    const acc = createAccount('hilmi');
    [10, 20].forEach(acc.deposit);
    expect(acc.balance).toBe(30);
  });

  it('memoize & once', () => {
    const slow = vi.fn((n: number) => n * n);
    const fast = memoize(slow);
    expect(fast(4)).toBe(16);
    expect(fast(4)).toBe(16);
    expect(slow).toHaveBeenCalledTimes(1);

    const init = vi.fn(() => 'conn');
    const connect = once(init);
    connect();
    connect();
    expect(init).toHaveBeenCalledOnce();
  });

  it('tiap closure punya state sendiri', () => {
    const a = idGenerator('CAT');
    const b = idGenerator('DOG');
    expect([a(), a(), b()]).toEqual(['CAT-1', 'CAT-2', 'DOG-1']);
  });

  it('gotcha var vs let di loop', () => {
    expect(loopWithVar()).toEqual([3, 3, 3]);
    expect(loopWithLet()).toEqual([0, 1, 2]);
  });
});
