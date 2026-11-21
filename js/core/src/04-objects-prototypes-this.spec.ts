import {
  animal,
  callLater,
  Counter,
  deepCopy,
  describeCat,
  introduce,
  LegacyCounter,
  makeCat,
  makePoint,
  move,
  prototypeChain,
  shallowCopy,
  withKey,
} from './04-objects-prototypes-this.ts';

describe('04 object, prototype & this', () => {
  it('object literal: shorthand, computed key, spread, destructuring', () => {
    const p = makePoint(1, 2);
    expect(move(p, 5)).toEqual({ x: 6, y: 2 });
    expect(p).toEqual({ x: 1, y: 2 }); // spread = object baru, aslinya utuh
    expect(withKey('warna', 'oren')).toEqual({ warna: 'oren' });
    expect(describeCat({ name: 'Oyen', ras: 'domestik', berat: 5 })).toBe('Oyen (0 th), info lain: ras,berat');
  });

  it('prototype delegation dengan Object.create', () => {
    const cat = makeCat('Oyen');
    expect(cat.describe()).toBe('Oyen bilang meong');
    expect(Object.getPrototypeOf(cat)).toBe(animal);
    expect(Object.hasOwn(cat, 'describe')).toBe(false); // diwarisi lewat delegasi
  });

  it('class = sugar: method ada di prototype, bukan di instance', () => {
    const c = new Counter(0);
    expect(typeof Counter).toBe('function');
    expect(Object.hasOwn(c, 'increment')).toBe(false);
    expect(Object.hasOwn(Counter.prototype, 'increment')).toBe(true);
    expect(Object.hasOwn(c, 'incrementBound')).toBe(true);
    expect(new (LegacyCounter as any)(5).increment()).toBe(6);
    expect(prototypeChain(c)).toEqual(['Counter', 'Object']);
    expect(prototypeChain([])).toEqual(['Array', 'Object']);
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

  it('call / apply / bind', () => {
    const cat = { name: 'Oyen' };
    expect(introduce.call(cat, 'Halo')).toBe('Halo, aku Oyen!');
    expect(introduce.apply(cat, ['Hai', '.'])).toBe('Hai, aku Oyen.');
    expect(introduce.bind(cat, 'Yo')()).toBe('Yo, aku Oyen!');
  });

  it('object itu reference: shallow vs deep copy', () => {
    const src = { name: 'Oyen', tags: ['oren'] };
    const shallow = shallowCopy(src);
    const deep = deepCopy(src);
    src.tags.push('gendut');
    expect(shallow.tags).toEqual(['oren', 'gendut']); // array-nya masih dipakai bareng
    expect(deep.tags).toEqual(['oren']);
    expect(shallow).not.toBe(src);
  });
});
