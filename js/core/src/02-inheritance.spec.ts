import { Employee, Manager, ValidationError } from './02-inheritance.ts';

describe('02 inheritance', () => {
  it('subclass override method dan memanggil super', () => {
    const m = new Manager('Bob', 1000, 200);
    m.addReport(new Employee('Alice', 500));
    expect(m.monthlyPay()).toBe(1000 + 200 + 100);
  });

  it('method parent memanggil versi override (dynamic dispatch)', () => {
    const m = new Manager('Bob', 1000);
    expect(m.describe()).toBe('Bob (manager) dibayar 1000');
  });

  it('instanceof mengikuti rantai inheritance', () => {
    const m = new Manager('Bob', 1000);
    expect(m).toBeInstanceOf(Manager);
    expect(m).toBeInstanceOf(Employee);
    expect(Object.getPrototypeOf(Manager.prototype)).toBe(Employee.prototype);
  });

  it('static field milik class (dan diwarisi lewat prototype constructor)', () => {
    const before = Employee.count;
    new Employee('x', 1);
    new Manager('y', 1);
    expect(Employee.count).toBe(before + 2);
  });

  it('extends built-in Error', () => {
    const err = new ValidationError('email', 'email tidak valid');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('ValidationError');
    expect(err.field).toBe('email');
  });
});
