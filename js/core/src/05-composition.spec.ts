import { Article, Car, ElectricEngine, type Engine, PetrolEngine } from './05-composition.ts';

describe('05 composition', () => {
  it('perilaku Car ditentukan dependency yang di-inject', () => {
    expect(new Car(new PetrolEngine()).drive()).toBe('mesin: brum brum');
    expect(new Car(new ElectricEngine()).drive()).toBe('mesin: ngiiing');
  });

  it('dependency gampang diganti stub saat test', () => {
    const stub: Engine = { start: () => 'stub' };
    expect(new Car(stub).drive()).toBe('mesin: stub');
  });

  it('mixin menambahkan perilaku tanpa multiple inheritance', () => {
    const a = new Article('Belajar OOP');
    const now = new Date('2026-11-21T00:00:00Z');
    a.touch(now);
    a.softDelete(now);
    expect(a.title).toBe('Belajar OOP');
    expect(a.createdAt).toBe(now);
    expect(a.isDeleted).toBe(true);
  });
});
