# Unit test berlapis

```
            /\        @QuarkusTest + RestAssured   (PetResourceTest, LoginMechanismsTest, JpaPetRepositoryTest)
           /  \       -> app beneran start, HTTP beneran, DB H2
          /----\      @QuarkusComponentTest        (AdoptionServiceComponentTest)
         /      \     -> cuma container CDI, dependency lain auto-mock
        /--------\    Unit test murni + Mockito     (PetTest, MoneyTest, AdoptionServiceTest, ...)
       /__________\   -> new object biasa, milidetik
```

Semakin ke bawah semakin banyak dan cepat. Hasil `mvn test`: **65 test**, semuanya hijau.

## Kenapa kode ini gampang dites

Bukan karena framework testing-nya, tapi karena desainnya:

| Keputusan desain | Efek ke test |
|---|---|
| Domain tanpa import Quarkus/JPA | `PetTest` cukup `new Cat(..)` |
| Constructor injection | `new AdoptionService(mock, lambda, clock)`, tanpa reflection |
| `Clock` di-inject | Waktu bisa dibekukan, test umur/senior deterministik |
| Bergantung ke interface | Repository bisa diganti mock atau fake in-memory |
| Policy = functional interface | Stub pakai lambda, tanpa Mockito |

## Katalog teknik (cari di `src/test`)

| Teknik | File |
|---|---|
| `@Nested` + `@DisplayName` untuk grouping | `PetTest` |
| `@ParameterizedTest` + `@CsvSource` | `MoneyTest`, `PetTest` |
| `@MethodSource` (argumen berupa object) | `StandardFeePolicyTest` |
| `@NullAndEmptySource`, `@ValueSource` | `PetTest.nameIsRequired` |
| AssertJ fluent assertion, `extracting`, `usingRecursiveComparison` | hampir semua |
| Mockito `@Mock`, `@Captor`, BDD `given/then`, `never()` | `AdoptionServiceTest` |
| Fake (`Clock.fixed`) vs stub (lambda) vs mock | `AdoptionServiceTest` |
| Object Mother / test data builder | `support/TestPets` |
| **Contract test** (abstract test class, 2 implementasi) | `PetRepositoryContract` + `InMemory..Test` + `Jpa..Test` |
| `@QuarkusComponentTest` + `@InjectMock` | `AdoptionServiceComponentTest` |
| `@QuarkusTest` + RestAssured | `PetResourceTest` |
| `@TestSecurity` (pura-pura login) | `PetResourceTest` |
| Login sungguhan 4 mekanisme | `LoginMechanismsTest` |
| `@InjectMock` bean di `@QuarkusTest` | `PetResourceMockedServiceTest` |
| `@TestProfile` (config beda) | `InMemoryStorageProfileTest` |
| Transaksi programmatic di test | `QuarkusTransaction.requiringNew()` di `JpaPetRepositoryTest` |

## Mock vs stub vs fake vs spy

- **Stub**: kasih jawaban tetap. (`pet -> Money.rupiah(99_000)`)
- **Mock**: stub + bisa diverifikasi interaksinya. (`then(repository).should().save(..)`)
- **Fake**: implementasi beneran tapi ringan. (`InMemoryPetRepository`, `Clock.fixed`)
- **Spy**: object asli yang sebagian method-nya di-stub. (`@InjectSpy` di Quarkus)

Aturan praktis: mock untuk hal yang **kamu verifikasi interaksinya** (apakah `save` dipanggil),
fake untuk hal yang **cuma perlu bekerja** (penyimpanan, waktu).

## Hal teknis yang ketemu waktu bikin ini

- Jangan taruh `@Produces` di class test: `@QuarkusTest` meng-scan class test sebagai bean juga,
  hasilnya *ambiguous dependency*. Di component test, `Clock` di-`@InjectMock` saja.
- `@TestProfile` bikin Quarkus restart. Kelompokkan test per profile supaya tidak restart berkali-kali.
- Test `@QuarkusTest` share satu instance aplikasi + DB, jadi bersihkan data di `@BeforeEach`.
- `quarkus-junit` / `quarkus-junit-mockito` adalah nama artifact baru (dulu `quarkus-junit5` / `quarkus-junit5-mockito`).

## Perintah berguna

```bash
mvn test -Dtest=PetTest                       # satu class
mvn test -Dtest='PetTest$Encapsulation'       # satu @Nested
mvn test -Dtest=AdoptionServiceTest#adoptSavesPetAndReturnsReceipt
mvn quarkus:dev   # lalu tekan 'r': continuous testing, test jalan ulang tiap file berubah
```
