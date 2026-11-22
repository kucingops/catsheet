# OOP di project ini

Prinsipnya: **aturan bisnis tinggal di object yang punya datanya**. Service cuma merangkai.

## 4 pilar, ditunjuk ke kode

| Pilar | Artinya (versi interview) | Di mana |
|---|---|---|
| Encapsulation | Sembunyikan state, ubah cuma lewat method yang menjaga aturan | `Pet`: field private, tanpa setter, status cuma berubah lewat `adopt()` yang menolak adopsi kedua |
| Abstraction | Ekspos "apa", sembunyikan "bagaimana" | `Pet` abstract, `AdoptionFeePolicy`, `PetRepository` |
| Inheritance | Reuse state + perilaku dari parent | `Cat`/`Dog extends Pet` |
| Polymorphism | Satu panggilan, perilaku beda sesuai tipe runtime | `pet.baseAdoptionFee()`, `pet.sound()`, hook `seniorAgeInYears()` |

Contoh polymorphism yang "kerasa": `StandardFeePolicy.feeFor()` tidak punya satu pun
`if (pet instanceof Cat)`. Tambah `Rabbit` besok? Policy-nya tidak perlu diubah.

## Overloading vs overriding

- **Overriding** (runtime, dynamic dispatch): `Cat.sound()` menimpa `Pet.sound()`.
- **Overloading** (compile time): nama method sama, parameter beda. Contoh: `PetId.of(String)` vs constructor `PetId(UUID)`.

## Abstract class vs interface

| | `abstract class Pet` | `interface AdoptionFeePolicy` |
|---|---|---|
| Punya state (field) | Ya (`id`, `name`, ...) | Tidak (cuma konstanta) |
| Constructor | Ya | Tidak |
| Multiple | Extend cuma satu | Implement banyak |
| Dipakai saat | Ada "is-a" + state/perilaku bersama | Kontrak/kemampuan, bisa dipasang ke class apa saja |

Sejak Java 8 interface boleh `default`/`static` method, Java 9 boleh `private` method. Tapi tetap tanpa state.

## Composition over inheritance

Biaya adopsi **tidak** dibikin lewat subclass (`DiscountedCat extends Cat`), tapi lewat object
lain yang dipasang: `AdoptionService` *punya* `AdoptionFeePolicy`. Mau ganti aturan? Ganti object-nya.
Inheritance dipakai hanya untuk hubungan "is-a" yang stabil (Cat is-a Pet).

## SOLID, satu contoh per huruf

| | Contoh |
|---|---|
| **S**ingle responsibility | `ApiKeyAuthenticationMechanism` cuma ambil header, `ApiKeyIdentityProvider` cuma verifikasi |
| **O**pen/closed | Policy baru = class baru yang implement `AdoptionFeePolicy`, service tidak diubah |
| **L**iskov substitution | `PetRepositoryContract`: test yang sama dijalankan untuk versi memory DAN JPA, dua-duanya harus lulus |
| **I**nterface segregation | `AdoptionFeePolicy` cuma 1 method, jadi lambda pun bisa jadi implementasinya |
| **D**ependency inversion | `AdoptionService` bergantung ke `PetRepository` (interface), bukan ke Hibernate |

## Design pattern yang muncul

| Pattern | Di mana |
|---|---|
| Strategy | `AdoptionFeePolicy` / `StandardFeePolicy` |
| Template Method | `Pet.isSenior()` (final) memanggil hook `seniorAgeInYears()` (boleh di-override) |
| Factory | `Cat.register(..)`, `StorageProducer.petRepository(..)` |
| Adapter | `JpaPetRepository` (domain `Pet` <-> `PetEntity`) |
| Repository | `PetRepository` |
| Value Object | `Money`, `PetId` (record, immutable, equality by value) |
| Object Mother | `TestPets` di test |

## Entity vs Value Object

- `Pet` = entity: `equals` berdasarkan **id**. Kucing ganti nama tetap kucing yang sama.
- `Money` = value object: `equals` berdasarkan **isi**. Rp100.000 ya Rp100.000.

## Fitur Java modern yang dipakai (dan versinya)

| Fitur | Versi | Di mana |
|---|---|---|
| `record` + compact constructor | 16 | `Money`, `PetId`, semua DTO |
| `sealed` / `permits` | 17 | `Pet`, `DomainException` |
| Pattern matching `instanceof` | 16 | `Pet.equals` |
| Switch pattern matching + `when` guard | 21 | `PetResponse.summary`, `PetMapper` |
| Record patterns | 21 | (bisa: `case Money(long r) when r == 0`) |
| `Stream.toList()` | 16 | repository |
| Text block | 15 | test JSON |
| Unnamed variable `_` | 22 | `case Cat _ ->` di `PetMapper`, `ErrorMappers` |
| Flexible constructor bodies (statement sebelum `super()`) | 25 | constructor `Cat` dan `Dog` |

Poin interview soal sealed + switch: switch atas sealed type itu **exhaustive**. Tidak perlu
`default`, dan kalau ada subclass baru, semua switch yang lupa di-update jadi **error compile**,
bukan bug di production.

## Pertanyaan interview yang sering keluar

1. *Kenapa field private + tanpa setter?* Supaya object tidak pernah ada di state tidak valid. Setter publik = siapa saja bisa bikin kucing yang sudah diadopsi tapi adopter-nya null.
2. *Kenapa domain dipisah dari entity JPA?* JPA butuh no-arg constructor, field mutable, proxy. Kalau domain = entity, aturan itu "bocor" ke desain domain. Trade-off-nya: ada mapper.
3. *`equals`/`hashCode` di entity JPA?* Jangan pakai semua field (lazy loading, id null sebelum persist). Di sini aman karena id (UUID) dibuat di domain sebelum disimpan.
4. *Kapan inheritance, kapan composition?* Inheritance untuk "is-a" yang stabil; perilaku yang bisa berubah (aturan biaya) lewat composition.
