import { promisify } from 'node:util';
import {
  eventLoopOrder,
  eventLoopOrderInsideMicrotask,
  legacyRead,
  mapLimit,
  paginate,
  parallel,
  retry,
  sequential,
  settled,
  sleep,
  withTimeout,
} from './07-async.ts';

describe('07 async & event loop', () => {
  it('urutan: sync -> nextTick -> promise/microtask -> timer', async () => {
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

  it('callback lama -> promise dengan util.promisify', async () => {
    const read = promisify(legacyRead);
    await expect(read('a')).resolves.toBe('isi:a');
    await expect(read('')).rejects.toThrow('key kosong');
  });

  it('paralel jauh lebih cepat dari sekuensial', async () => {
    const tasks = [() => sleep(40).then(() => 1), () => sleep(40).then(() => 2)];
    let t = performance.now();
    expect(await parallel(tasks)).toEqual([1, 2]);
    expect(performance.now() - t).toBeLessThan(75);

    t = performance.now();
    expect(await sequential(tasks)).toEqual([1, 2]);
    expect(performance.now() - t).toBeGreaterThanOrEqual(75);
  });

  it('allSettled tidak fail-fast', async () => {
    const res = await settled([async () => 'a', async () => Promise.reject(new Error('x')), async () => 'c']);
    expect(res).toEqual({ ok: ['a', 'c'], failed: 1 });
  });

  it('mapLimit membatasi konkurensi', async () => {
    let running = 0;
    let peak = 0;
    const out = await mapLimit([1, 2, 3, 4, 5], 2, async (n) => {
      peak = Math.max(peak, ++running);
      await sleep(5);
      running--;
      return n * 10;
    });
    expect(out).toEqual([10, 20, 30, 40, 50]);
    expect(peak).toBe(2);
  });

  it('timeout pakai AbortSignal: kerjaan lambat dibatalkan', async () => {
    await expect(withTimeout((signal) => sleep(200, signal), 20)).rejects.toThrow(/abort|timeout/i);
    await expect(withTimeout(async () => 'cepat', 50)).resolves.toBe('cepat');
  });

  it('retry sampai berhasil', async () => {
    let n = 0;
    const flaky = vi.fn(async () => {
      if (++n < 3) throw new Error('gagal');
      return 'ok';
    });
    await expect(retry(flaky, { baseMs: 1 })).resolves.toBe('ok');
    expect(flaky).toHaveBeenCalledTimes(3);
    await expect(retry(async () => Promise.reject(new Error('selalu')), { attempts: 2, baseMs: 1 })).rejects.toThrow(
      'selalu',
    );
  });

  it('async generator + for await', async () => {
    const pages: Record<number, string[]> = { 1: ['a', 'b'], 2: ['c'] };
    const seen: string[] = [];
    for await (const item of paginate(async (p) => pages[p] ?? [])) seen.push(item);
    expect(seen).toEqual(['a', 'b', 'c']);
  });
});
