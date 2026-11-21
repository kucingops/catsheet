# Persistence: pakai database vs tanpa database

Satu interface `PetRepository`, dua implementasi. Dipilih lewat config:

```properties
catsheet.storage=jpa      # default: Hibernate ORM + H2
catsheet.storage=memory   # ConcurrentHashMap, hilang saat restart
```

`StorageProducer` (CDI producer) yang memilih. Bean lain tidak tahu dan tidak peduli.

## Perbandingan

| | `InMemoryPetRepository` | `JpaPetRepository` |
|---|---|---|
| Data bertahan setelah restart | Tidak | Ya (di DB nyata; H2 mem di sini juga hilang) |
| Transaksi / rollback | Tidak ada | Ya, `@Transactional` |
| Concurrency | `ConcurrentHashMap` (thread-safe per operasi, bukan per use case) | Isolation level DB + `@Version` optimistic lock |
| Multi instance (scale out) | Tiap instance beda isi | Satu sumber data |
| Query | Stream filter di Java | JPQL/SQL, index DB |
| Kecepatan test | Mikrodetik | Butuh Quarkus + DB |
| Cocok untuk | Cache, prototipe, fake di test | Data bisnis |

## JPA: hal yang sering ditanya

**Inheritance mapping** (`PetEntity`): `SINGLE_TABLE` dengan discriminator `species`.
Satu tabel, query cepat, tapi kolom khusus subclass (`indoor`, `dog_size`) harus nullable.
Alternatif `JOINED` (normalized, butuh join) dan `TABLE_PER_CLASS` (union). Beda dengan
`@MappedSuperclass` yang cuma berbagi kolom dan tidak bisa di-query polymorphic.

**Entity lifecycle**: transient (baru di-`new`) -> managed (setelah `persist`/`find`) ->
detached (transaksi selesai) -> removed. Perubahan ke entity *managed* otomatis di-flush
saat commit: itu **dirty checking**. Makanya `JpaPetRepository.save()` untuk update cukup
mengubah field, tanpa `merge()` atau `update()`.

**`persist` vs `merge`**: `persist` bikin object itu sendiri jadi managed (untuk entity baru).
`merge` menyalin state object detached ke salinan managed dan mengembalikan salinan itu.
Salah pakai `merge` dengan `@Version` = `OptimisticLockException`.

**Optimistic locking (`@Version`)**: dua admin adopsi kucing yang sama bersamaan. Keduanya baca
versi 1. Yang commit duluan bikin versi 2. Yang kedua `UPDATE ... WHERE version = 1` kena 0 row,
Hibernate lempar `OptimisticLockException`. Tanpa lock DB, tanpa double adoption.

**`@Enumerated(EnumType.STRING)`**: default-nya ORDINAL (0, 1, 2). Sisipkan enum baru di tengah = data lama berubah arti.

**N+1**: `listAll()` lalu akses relasi lazy di loop = 1 query + N query. Solusi: `join fetch`,
`@EntityGraph`, atau batch fetching. (Project ini sengaja tanpa relasi supaya fokus, tapi pertanyaannya hampir pasti keluar.)

**Transaksi di Quarkus**: `jakarta.transaction.Transactional` (JTA, Narayana), bukan
`@Transactional` milik Spring. TxType: `REQUIRED` (default), `REQUIRES_NEW`, `SUPPORTS`,
`MANDATORY`, `NOT_SUPPORTED`, `NEVER`. Rollback otomatis untuk RuntimeException, tidak untuk
checked exception (sama seperti Spring). Self-invocation tidak lewat interceptor.
Versi programmatic: `QuarkusTransaction.requiringNew().run(...)` (dipakai di test).

## Panache: dua gaya

```java
// Repository (dipakai di sini): PetEntityDao implements PanacheRepositoryBase<PetEntity, String>
dao.findById(id); dao.list("status", AVAILABLE); dao.persist(entity);

// Active record: entity extends PanacheEntity
Cat.findById(id); Cat.list("status", AVAILABLE); cat.persist();
```

Active record lebih ringkas, tapi **tidak bisa** dipanggil dari entity abstract
(`PetEntity.findById` error saat runtime) dan lebih susah di-mock. Repository lebih mudah di-inject dan di-test.

## Ganti ke PostgreSQL

```xml
<artifactId>quarkus-jdbc-postgresql</artifactId>
```
```properties
quarkus.datasource.db-kind=postgresql
# kosongkan jdbc.url di dev/test -> Quarkus Dev Services otomatis start Postgres via Docker/Testcontainers
%prod.quarkus.datasource.jdbc.url=jdbc:postgresql://db:5432/catsheet
quarkus.hibernate-orm.schema-management.strategy=none   # production pakai Flyway/Liquibase
```
