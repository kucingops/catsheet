import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { CatRepository } from '../../cats/cat.repository.js';
import type { Cat } from '../../cats/domain/cat.js';
import { CatOrmEntity } from './cat.orm-entity.js';

/**
 * DATABASE DENGAN ORM: TypeORM (padanan JPA/Hibernate + Spring Data).
 * Adapter ini membungkus `Repository<CatOrmEntity>` milik TypeORM supaya cocok dengan port `CatRepository`.
 * Ini Adapter pattern: service nggak tahu dia sedang ngobrol dengan TypeORM.
 */
@Injectable()
export class TypeOrmCatRepository extends CatRepository {
  constructor(
    @InjectRepository(CatOrmEntity)
    private readonly orm: Repository<CatOrmEntity>,
  ) {
    super();
  }

  async findAll(): Promise<Cat[]> {
    const rows = await this.orm.find({ order: { createdAt: 'ASC', id: 'ASC' } });
    return rows.map((r) => r.toDomain());
  }

  async findById(id: string): Promise<Cat | null> {
    return (await this.orm.findOneBy({ id }))?.toDomain() ?? null;
  }

  async save(cat: Cat): Promise<void> {
    await this.orm.save(CatOrmEntity.fromDomain(cat)); // save() = upsert berdasar primary key
  }

  async delete(id: string): Promise<boolean> {
    const res = await this.orm.delete({ id });
    return (res.affected ?? 0) > 0;
  }
}
