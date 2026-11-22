import { Column, Entity, PrimaryColumn } from 'typeorm';
import { Cat, type CatStatus } from '../../cats/domain/cat.js';

/**
 * ENTITY ORM (padanan @Entity JPA). Sengaja DIPISAH dari domain `Cat`.
 *
 * Dua gaya di TypeORM:
 *  - Active Record: entity extends BaseEntity, punya `.save()` sendiri (mirip Rails/Panache).
 *  - Data Mapper  : entity cuma data, simpan lewat Repository (mirip Spring Data JPA). <- dipakai di sini.
 *
 * Dengan entity terpisah, domain tetap bersih dari decorator ORM, dan aturan bisnis (adopt, validasi)
 * nggak bisa di-bypass dengan nge-set kolom langsung. Harga yang dibayar: perlu mapper fromDomain/toDomain.
 *
 * Tipe kolom ditulis eksplisit (`'text'`, `'integer'`) supaya nggak bergantung ke reflect metadata.
 */
@Entity({ name: 'cats' })
export class CatOrmEntity {
  @PrimaryColumn('text')
  id!: string;

  @Column('text')
  name!: string;

  @Column('text')
  breed!: string;

  @Column('integer')
  age!: number;

  @Column('text')
  status!: CatStatus;

  @Column('text', { name: 'adopted_by', nullable: true })
  adoptedBy!: string | null;

  @Column('text', { name: 'created_at' })
  createdAt!: string;

  static fromDomain(cat: Cat): CatOrmEntity {
    return Object.assign(new CatOrmEntity(), cat.toSnapshot());
  }

  toDomain(): Cat {
    return Cat.restore({
      id: this.id,
      name: this.name,
      breed: this.breed,
      age: this.age,
      status: this.status,
      adoptedBy: this.adoptedBy,
      createdAt: this.createdAt,
    });
  }
}
