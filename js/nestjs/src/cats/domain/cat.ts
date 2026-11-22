import { randomUUID } from 'node:crypto';
import { ConflictError, ValidationError } from '../../common/domain-error.js';

export type CatStatus = 'available' | 'adopted';

/** Bentuk data "mentah" untuk disimpan/dikirim. Domain object sendiri tetap tertutup. */
export interface CatSnapshot {
  id: string;
  name: string;
  breed: string;
  age: number;
  status: CatStatus;
  adoptedBy: string | null;
  createdAt: string; // ISO string, supaya gampang disimpan di file/SQL
}

export interface NewCat {
  name: string;
  breed: string;
  age: number;
}

/**
 * RICH DOMAIN MODEL (lawan dari anemic model yang cuma getter/setter).
 *
 * - Constructor private: object cuma bisa lahir lewat `create()` (data baru, divalidasi)
 *   atau `restore()` (data lama dari storage, dianggap sudah valid).
 * - State diubah lewat method bermakna bisnis (`adopt`, `rename`), bukan setter bebas.
 * - Class ini NGGAK tahu NestJS, HTTP, atau database. Itu yang bikin dia gampang di-unit-test
 *   dan bisa dipakai ulang oleh repository apa pun (memory/file/sql/orm).
 */
export class Cat {
  readonly id: string;
  readonly breed: string;
  readonly createdAt: Date;
  #name: string;
  #age: number;
  #status: CatStatus;
  #adoptedBy: string | null;

  private constructor(s: CatSnapshot) {
    this.id = s.id;
    this.breed = s.breed;
    this.createdAt = new Date(s.createdAt);
    this.#name = s.name;
    this.#age = s.age;
    this.#status = s.status;
    this.#adoptedBy = s.adoptedBy;
  }

  static create(input: NewCat, deps: { id?: () => string; now?: () => Date } = {}): Cat {
    const name = Cat.#validName(input.name);
    if (!input.breed?.trim()) throw new ValidationError('breed wajib diisi');
    if (!Number.isInteger(input.age) || input.age < 0 || input.age > 30) {
      throw new ValidationError('age harus bilangan bulat 0..30');
    }
    return new Cat({
      id: (deps.id ?? randomUUID)(),
      name,
      breed: input.breed.trim(),
      age: input.age,
      status: 'available',
      adoptedBy: null,
      createdAt: (deps.now?.() ?? new Date()).toISOString(),
    });
  }

  static restore(snapshot: CatSnapshot): Cat {
    return new Cat(snapshot);
  }

  get name(): string {
    return this.#name;
  }
  get age(): number {
    return this.#age;
  }
  get status(): CatStatus {
    return this.#status;
  }
  get adoptedBy(): string | null {
    return this.#adoptedBy;
  }
  get isAvailable(): boolean {
    return this.#status === 'available';
  }

  adopt(adopter: string): void {
    if (!this.isAvailable) {
      throw new ConflictError(`${this.#name} sudah diadopsi oleh ${this.#adoptedBy}`);
    }
    this.#status = 'adopted';
    this.#adoptedBy = adopter;
  }

  rename(newName: string): void {
    this.#name = Cat.#validName(newName);
  }

  toSnapshot(): CatSnapshot {
    return {
      id: this.id,
      name: this.#name,
      breed: this.breed,
      age: this.#age,
      status: this.#status,
      adoptedBy: this.#adoptedBy,
      createdAt: this.createdAt.toISOString(),
    };
  }

  /** Dipanggil otomatis oleh JSON.stringify -> Nest bisa langsung return Cat dari controller. */
  toJSON(): CatSnapshot {
    return this.toSnapshot();
  }

  static #validName(raw: string): string {
    const name = raw?.trim() ?? '';
    if (name.length < 2 || name.length > 40) throw new ValidationError('name harus 2..40 karakter');
    return name;
  }
}
