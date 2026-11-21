import { biggest, Circle, format, largest, Money, Rectangle, Shape, totalArea } from './03-polymorphism.ts';

describe('03 polymorphism', () => {
  it('satu tipe Shape, perilaku area() beda per subclass', () => {
    const shapes: Shape[] = [new Rectangle(2, 3), new Circle(1)];
    expect(totalArea(shapes)).toBeCloseTo(6 + Math.PI);
    expect(shapes.map((s) => s.describe())).toEqual(['rectangle luas 6.00', 'circle luas 3.14']);
  });

  it('structural typing: object literal tanpa implements tetap diterima', () => {
    const custom = { area: () => 100, label: 'tanah' };
    expect(biggest([new Rectangle(1, 1), custom])).toBe(custom);
  });

  it('overload signature, satu implementasi', () => {
    expect(format(1234567)).toBe('1.234.567');
    expect(format(new Date('2026-01-31T00:00:00Z'))).toBe('2026-01-31');
    expect(format(['a', 'b'])).toBe('a, b');
  });

  it('generics dengan bound (T extends Comparable<T>)', () => {
    const max = largest([new Money(5), new Money(50), new Money(10)]);
    expect(max.cents).toBe(50);
    expect(() => largest<Money>([])).toThrow();
  });

  it('abstract class tidak bisa di-new (dicek compiler)', () => {
    // @ts-expect-error -- Cannot create an instance of an abstract class
    const make = () => new Shape();
    expect(make).toBeTypeOf('function');
  });
});
