import { animalProto, callLater, Counter, LegacyCounter, makeCat, prototypeChain } from './07-prototype-and-this.ts';

describe('07 prototype & this', () => {
  it('class hanyalah sugar: method ada di prototype, bukan di instance', () => {
    const c = new Counter(0);
    expect(Object.hasOwn(c, 'increment')).toBe(false);
    expect(Object.hasOwn(Counter.prototype, 'increment')).toBe(true);
    expect(Object.hasOwn(c, 'incrementBound')).toBe(true); // arrow field = milik instance
    expect(typeof Counter).toBe('function');
  });

  it('constructor function lama berperilaku sama', () => {
    const legacy = new (LegacyCounter as any)(5);
    expect(legacy.increment()).toBe(6);
  });

  it('method yang dilepas dari object kehilangan `this`', () => {
    const c = new Counter(0);
    const detached = c.increment;
    expect(() => callLater(detached)).toThrow(TypeError);
  });

  it('tiga cara memperbaiki: arrow wrapper, bind, arrow field', () => {
    const c = new Counter(0);
    callLater(() => c.increment());
    callLater(c.increment.bind(c));
    callLater(c.incrementBound);
    expect(c.count).toBe(3);
  });

  it('rantai prototype', () => {
    expect(prototypeChain(new Counter(0))).toEqual(['Counter', 'Object']);
    expect(prototypeChain([])).toEqual(['Array', 'Object']);
  });

  it('Object.create: delegasi prototype tanpa class', () => {
    const cat = makeCat('Oyen');
    expect(cat.speak()).toBe('Oyen bilang meong');
    expect(Object.getPrototypeOf(cat)).toBe(animalProto);
  });
});
