import {
  AppConfig,
  CachingDataSource,
  ExpressShipping,
  OrderService,
  RequestBuilder,
  ShippingFactory,
} from './08-design-patterns.ts';

describe('08 design patterns', () => {
  it('singleton', () => {
    expect(AppConfig.instance).toBe(AppConfig.instance);
  });

  it('factory + strategy', () => {
    const s = ShippingFactory.create('EXP');
    expect(s).toBeInstanceOf(ExpressShipping);
    expect(s.cost(2)).toBe(35_000);
    expect(ShippingFactory.create('REG').cost(2)).toBe(14_000);
    expect(() => ShippingFactory.create('XXX')).toThrow('kurir tidak dikenal');
  });

  it('observer', () => {
    const svc = new OrderService();
    const listener = vi.fn();
    svc.on('paid', listener);
    svc.pay('ORD-1', 50_000);
    expect(listener).toHaveBeenCalledWith('ORD-1', 50_000);
  });

  it('decorator: cache membungkus sumber data asli', () => {
    const read = vi.fn((k: string) => k.toUpperCase());
    const ds = new CachingDataSource({ read });
    expect(ds.read('a')).toBe('A');
    expect(ds.read('a')).toBe('A');
    expect(read).toHaveBeenCalledTimes(1);
  });

  it('builder: fluent dan hasilnya immutable', () => {
    const req = new RequestBuilder('/cats').post({ name: 'Oyen' }).bearer('t0k3n').build();
    expect(req).toEqual({
      method: 'POST',
      url: '/cats',
      headers: { 'content-type': 'application/json', authorization: 'Bearer t0k3n' },
      body: '{"name":"Oyen"}',
    });
    expect(Object.isFrozen(req)).toBe(true);
  });
});
