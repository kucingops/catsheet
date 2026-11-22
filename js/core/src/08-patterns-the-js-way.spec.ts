import {
  buildRequest,
  byAgeDesc,
  byName,
  compose,
  createDoorbell,
  createOrderService,
  type Middleware,
  sortCats,
  withCache,
  withLogging,
} from './08-patterns-the-js-way.ts';

const cats = [
  { name: 'Mochi', age: 2 },
  { name: 'Oyen', age: 5 },
  { name: 'Belang', age: 3 },
];

describe('08 patterns the JS way', () => {
  it('strategy = function yang dioper', () => {
    expect(sortCats(cats, byName).map((c) => c.name)).toEqual(['Belang', 'Mochi', 'Oyen']);
    expect(sortCats(cats, byAgeDesc).map((c) => c.age)).toEqual([5, 3, 2]);
  });

  it('observer: EventEmitter', () => {
    const svc = createOrderService();
    const listener = vi.fn();
    svc.on('paid', listener);
    svc.pay('ORD-1', 50_000);
    expect(listener).toHaveBeenCalledWith('ORD-1', 50_000);
  });

  it('observer: EventTarget (standar web)', () => {
    const bell = createDoorbell();
    const seen: string[] = [];
    bell.onRing((who) => seen.push(who));
    bell.ring('kurir');
    expect(seen).toEqual(['kurir']);
  });

  it('decorator = higher-order function', () => {
    const log = vi.fn();
    const add = withLogging('add', (a: number, b: number) => a + b, log);
    expect(add(1, 2)).toBe(3);
    expect(log).toHaveBeenCalledWith('add(1, 2)');

    let t = 0;
    const load = vi.fn((k: string) => k.toUpperCase());
    const cached = withCache(load, 100, () => t);
    cached('a');
    cached('a');
    expect(load).toHaveBeenCalledTimes(1);
    t = 150; // lewat TTL
    cached('a');
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('builder -> options object, hasilnya immutable', () => {
    const req = buildRequest('/cats', { body: { name: 'Oyen' }, token: 't0k3n' });
    expect(req).toEqual({
      method: 'POST',
      url: '/cats',
      headers: { 'content-type': 'application/json', authorization: 'Bearer t0k3n' },
      body: '{"name":"Oyen"}',
    });
    expect(Object.isFrozen(req)).toBe(true);
    expect(buildRequest('/ping')).toEqual({ method: 'GET', url: '/ping', headers: {} });
  });

  it('middleware chain: urutan masuk & keluar (onion)', async () => {
    const trail: string[] = [];
    const mw =
      (name: string): Middleware<string[]> =>
      async (ctx, next) => {
        ctx.push(`${name}>`);
        await next();
        ctx.push(`<${name}`);
      };
    await compose([mw('auth'), mw('log')])(trail);
    expect(trail).toEqual(['auth>', 'log>', '<log', '<auth']);
  });
});
