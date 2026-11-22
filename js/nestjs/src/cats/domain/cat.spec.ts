import { ConflictError, ValidationError } from '../../common/domain-error.js';
import { Cat } from './cat.js';

// Unit test domain murni: tanpa Nest, tanpa DB, tanpa mock. Paling cepat & paling berharga.
const fixed = { id: () => 'cat-1', now: () => new Date('2026-11-21T00:00:00Z') };

describe('Cat (domain)', () => {
  it('create() memvalidasi dan menormalkan input', () => {
    const cat = Cat.create({ name: '  Oyen ', breed: 'Domestik', age: 2 }, fixed);
    expect(cat.toSnapshot()).toEqual({
      id: 'cat-1',
      name: 'Oyen',
      breed: 'Domestik',
      age: 2,
      status: 'available',
      adoptedBy: null,
      createdAt: '2026-11-21T00:00:00.000Z',
    });
  });

  it.each([
    [{ name: 'A', breed: 'x', age: 1 }, 'name'],
    [{ name: 'Oyen', breed: ' ', age: 1 }, 'breed'],
    [{ name: 'Oyen', breed: 'x', age: -1 }, 'age'],
    [{ name: 'Oyen', breed: 'x', age: 1.5 }, 'age'],
  ])('menolak input tidak valid %#', (input, field) => {
    expect(() => Cat.create(input)).toThrow(ValidationError);
    expect(() => Cat.create(input)).toThrow(field);
  });

  it('adopt() mengubah state, adopt kedua kali = conflict', () => {
    const cat = Cat.create({ name: 'Oyen', breed: 'x', age: 1 });
    cat.adopt('alice');
    expect(cat.status).toBe('adopted');
    expect(cat.adoptedBy).toBe('alice');
    expect(() => cat.adopt('bob')).toThrow(ConflictError);
    expect(cat.adoptedBy).toBe('alice');
  });

  it('restore(toSnapshot()) menghasilkan object yang setara (round trip persistence)', () => {
    const cat = Cat.create({ name: 'Oyen', breed: 'x', age: 1 });
    cat.adopt('alice');
    expect(Cat.restore(cat.toSnapshot()).toSnapshot()).toEqual(cat.toSnapshot());
  });

  it('state internal tidak bisa diubah dari luar', () => {
    const cat = Cat.create({ name: 'Oyen', breed: 'x', age: 1 });
    expect(() => {
      (cat as any).status = 'adopted';
    }).toThrow(TypeError);
    expect(JSON.parse(JSON.stringify(cat)).status).toBe('available');
  });
});
