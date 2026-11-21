import { DatabaseSync, type StatementSync } from 'node:sqlite';
import type { OnModuleDestroy } from '@nestjs/common';
import { CatRepository } from '../../cats/cat.repository.js';
import { Cat, type CatSnapshot } from '../../cats/domain/cat.js';

interface CatRow {
  id: string;
  name: string;
  breed: string;
  age: number;
  status: CatSnapshot['status'];
  adopted_by: string | null;
  created_at: string;
}

/**
 * DATABASE TANPA ORM: SQL mentah pakai `node:sqlite` (modul bawaan Node, tanpa npm install).
 * Padanannya di Spring: JdbcTemplate / JDBC + RowMapper.
 *
 * Poin interview:
 *  - Prepared statement (`?` / `:named`) = parameter di-bind, bukan string concat -> aman dari SQL injection.
 *  - Mapping row <-> domain ditulis manual (`toDomain`). Lebih verbose, tapi query 100% terkontrol.
 *  - Upsert pakai `INSERT ... ON CONFLICT DO UPDATE`.
 *  - `node:sqlite` API-nya SYNCHRONOUS: query memblok event loop. Untuk SQLite lokal yang cepat
 *    biasanya oke, tapi untuk DB lewat jaringan (Postgres/MySQL) selalu pakai driver async (pg, mysql2).
 */
export class SqliteCatRepository extends CatRepository implements OnModuleDestroy {
  readonly #db: DatabaseSync;
  readonly #stmt: Record<'all' | 'byId' | 'upsert' | 'delete', StatementSync>;

  constructor(location = ':memory:') {
    super();
    this.#db = new DatabaseSync(location);
    this.#db.exec(`
      CREATE TABLE IF NOT EXISTS cats (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        breed       TEXT NOT NULL,
        age         INTEGER NOT NULL CHECK (age >= 0),
        status      TEXT NOT NULL CHECK (status IN ('available', 'adopted')),
        adopted_by  TEXT,
        created_at  TEXT NOT NULL
      )`);
    this.#stmt = {
      all: this.#db.prepare('SELECT * FROM cats ORDER BY created_at, id'),
      byId: this.#db.prepare('SELECT * FROM cats WHERE id = ?'),
      upsert: this.#db.prepare(`
        INSERT INTO cats (id, name, breed, age, status, adopted_by, created_at)
        VALUES (:id, :name, :breed, :age, :status, :adoptedBy, :createdAt)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name, age = excluded.age,
          status = excluded.status, adopted_by = excluded.adopted_by`),
      delete: this.#db.prepare('DELETE FROM cats WHERE id = ?'),
    };
  }

  async findAll(): Promise<Cat[]> {
    return (this.#stmt.all.all() as unknown as CatRow[]).map(toDomain);
  }

  async findById(id: string): Promise<Cat | null> {
    const row = this.#stmt.byId.get(id) as unknown as CatRow | undefined;
    return row ? toDomain(row) : null;
  }

  async save(cat: Cat): Promise<void> {
    this.#stmt.upsert.run({ ...cat.toSnapshot() });
  }

  async delete(id: string): Promise<boolean> {
    return this.#stmt.delete.run(id).changes > 0;
  }

  /** Contoh transaksi manual: semua atau tidak sama sekali. */
  async saveAll(cats: readonly Cat[]): Promise<void> {
    this.#db.exec('BEGIN');
    try {
      for (const c of cats) this.#stmt.upsert.run({ ...c.toSnapshot() });
      this.#db.exec('COMMIT');
    } catch (err) {
      this.#db.exec('ROLLBACK');
      throw err;
    }
  }

  onModuleDestroy(): void {
    if (this.#db.isOpen) this.#db.close();
  }
}

function toDomain(r: CatRow): Cat {
  return Cat.restore({
    id: r.id,
    name: r.name,
    breed: r.breed,
    age: r.age,
    status: r.status,
    adoptedBy: r.adopted_by,
    createdAt: r.created_at,
  });
}
