# 05 · Persistence: pakai ORM, tanpa ORM, dan tanpa database

Satu interface `IProductRepository` (di domain), tiga implementasi. Dipilih lewat config `Persistence:Provider`:

```bash
dotnet run --project src/Catsheet.Api --launch-profile efcore    # default
dotnet run --project src/Catsheet.Api --launch-profile ado
dotnet run --project src/Catsheet.Api --launch-profile inmemory
# atau env var: Persistence__Provider=Ado  (dua underscore = ":")
```

| Provider | File | Lifetime DI | Padanan Java |
|---|---|---|---|
| `InMemory` | `Persistence/InMemory/InMemoryProductRepository.cs` | Singleton | `ConcurrentHashMap` di `@Repository` |
| `EfCore` | `Persistence/EfCore/*` | Scoped | JPA/Hibernate + Spring Data |
| `Ado` | `Persistence/Ado/AdoProductRepository.cs` | Singleton | JDBC / `JdbcTemplate` |

Service dan endpoint **tidak berubah sama sekali** ketika provider diganti. Contract test (`ProductRepositoryContract`) membuktikan ketiganya berperilaku sama.

## EF Core ≈ JPA

| JPA / Hibernate | EF Core |
|---|---|
| `EntityManager` / persistence context | `DbContext` (unit of work + identity map) |
| `@Entity`, `@Table`, `@Column` | Fluent API di `OnModelCreating` (atau attribute) |
| `@Embeddable` / `@Embedded` | `ComplexProperty` (dipakai untuk `Money`) |
| `@Inheritance(SINGLE_TABLE)` + `@DiscriminatorColumn` | `HasDiscriminator` (TPH, default) |
| `JOINED` / `TABLE_PER_CLASS` | `UseTptMappingStrategy()` / `UseTpcMappingStrategy()` |
| `flush()` + commit | `SaveChanges()`, otomatis 1 transaksi |
| Dirty checking | Change tracker (`EntityState.Modified`) |
| JPQL / Criteria | LINQ → SQL |
| `@Transactional` | `SaveChanges` (implisit) atau `db.Database.BeginTransactionAsync()` |
| `@Version` | `[Timestamp]` / `.IsRowVersion()` / `.IsConcurrencyToken()` |
| `FetchType.LAZY` + `JOIN FETCH` | Lazy loading (opt-in, butuh proxies) / `Include()` |
| Read-only query | `AsNoTracking()` |
| `@Modifying @Query("delete ...")` | `ExecuteDeleteAsync()` / `ExecuteUpdateAsync()` |
| Flyway/Liquibase | EF Migrations (`dotnet ef migrations add Init`) |
| No-arg constructor wajib | Sama: constructor `private`/`protected` tanpa parameter untuk EF |

Yang dipamerkan di `CatalogDbContext`:
- **Mapping tanpa mengotori domain**: domain tidak punya attribute EF sama sekali.
- **Value object** `Money` → 2 kolom (`PriceAmount`, `PriceCurrency`).
- **Inheritance TPH** dengan discriminator kolom `Kind`.
- **Id dari domain** (`ValueGeneratedNever`, UUIDv7), bukan auto-increment.

### Topik EF yang sering ditanya
- **N+1**: loop yang mengakses navigation property dengan lazy loading. Fix: `Include()`, projection `Select(...)`, atau `AsSplitQuery()` untuk banyak collection.
- **Tracking vs no-tracking**: query untuk baca saja pakai `AsNoTracking()` (lihat `ListAsync`).
- **Lifetime DbContext**: **Scoped**, satu per request. Bukan thread-safe. Jangan inject ke Singleton (*captive dependency*, lihat [06](06-di-pipeline.md)).
- **`EnsureCreated` vs Migrations**: `EnsureCreated` (dipakai di sini supaya cepat dicoba) tidak bisa evolusi schema. Production pakai migrations.
- **Concurrency**: `OrderService.CheckoutAsync` punya catatan oversell. Fix-nya optimistic concurrency token + retry, atau `UPDATE ... SET Stock = Stock - @qty WHERE Stock >= @qty` (atomic).
- **Gotcha SQLite**: SQLite tidak punya tipe `decimal`, EF menyimpannya sebagai TEXT. `ORDER BY`/`SUM` pada kolom itu bisa aneh. Ini demo; production pakai Postgres/SQL Server.

## ADO.NET ≈ JDBC (tanpa ORM)

Semua manual, dan itu poinnya:
```csharp
await using var conn = new SqliteConnection(cs);   // pooling diurus driver
await conn.OpenAsync(ct);
await using var cmd = conn.CreateCommand();
cmd.CommandText = "SELECT ... FROM Products WHERE Id = $id";
cmd.Parameters.AddWithValue("$id", id.ToString()); // parameter, BUKAN string concat
await using var reader = await cmd.ExecuteReaderAsync(ct);
```
- Mapping row → object manual (`Map`), termasuk memilih subclass dari kolom `Kind`. Di EF ini otomatis.
- Transaksi eksplisit (`BeginTransactionAsync` / `CommitAsync`) di `AddAsync`.
- `await using` = try-with-resources.

**Kapan tanpa ORM?** Query reporting yang berat, bulk insert, SQL spesifik vendor, hot path yang perlu kontrol penuh. Jalan tengahnya **Dapper** (micro-ORM: SQL ditulis sendiri, mapping otomatis), mirip `JdbcTemplate` + `BeanPropertyRowMapper`. Pola yang umum: EF untuk command/tulis, Dapper atau SQL mentah untuk query/baca (CQRS-lite).

## In-memory (tanpa persistence)

- Data hilang saat restart. Cocok untuk prototipe, test, atau cache.
- Singleton, jadi **harus thread-safe**: pakai `ConcurrentDictionary`, bukan `Dictionary`.
- Object disimpan by reference, jadi mutasi di luar langsung "tersimpan" walau tanpa `UpdateAsync`. Perilaku ini beda dengan EF/ADO, salah satu alasan kenapa contract test berguna.
