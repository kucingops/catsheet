import {
  createCounter,
  eventLoopOrder,
  eventLoopOrderInsideMicrotask,
  fetchAllParallel,
  fetchAllSettled,
  sleep,
  withTimeout,
} from './09-async-and-closure.ts';

describe('09 async & closure', () => {
  it('urutan event loop: sync -> nextTick -> promise/microtask -> timer', async () => {
    expect(await eventLoopOrder()).toEqual(['sync 1', 'sync 2', 'nextTick', 'promise', 'microtask', 'timeout']);
  });

  it('gotcha: dari dalam microtask, nextTick kalah duluan dari promise', async () => {
    expect(await eventLoopOrderInsideMicrotask()).toEqual([
      'sync 1',
      'sync 2',
      'promise',
      'microtask',
      'nextTick',
      'timeout',
    ]);
  });

  it('closure menyimpan state privat', () => {
    const c = createCounter(10);
    c.inc();
    c.inc();
    expect(c.get()).toBe(12);
    expect((c as any).value).toBeUndefined();
  });

  it('Promise.all jalan paralel', async () => {
    const start = performance.now();
    const out = await fetchAllParallel([() => sleep(50).then(() => 1), () => sleep(50).then(() => 2)]);
    expect(out).toEqual([1, 2]);
    expect(performance.now() - start).toBeLessThan(95);
  });

  it('Promise.allSettled tidak fail-fast', async () => {
    const res = await fetchAllSettled([async () => 'a', async () => Promise.reject(new Error('x')), async () => 'c']);
    expect(res).toEqual({ ok: ['a', 'c'], failed: 1 });
  });

  it('withTimeout reject kalau kelamaan', async () => {
    await expect(withTimeout(sleep(200), 20)).rejects.toThrow(/timeout|aborted/i);
    await expect(withTimeout(Promise.resolve('cepat'), 50)).resolves.toBe('cepat');
  });
});
