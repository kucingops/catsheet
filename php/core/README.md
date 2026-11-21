# PHP core: OOP, SOLID, pattern, testing

PHP murni, tanpa framework. Tiap konsep ada kodenya di `src/` dan dibuktikan di `tests/`.

```bash
composer install && composer test   # butuh PHP 8.6
```

## Daftar isi

1. [Empat pilar OOP](#1-empat-pilar-oop)
2. [Interface vs abstract class vs trait](#2-interface-vs-abstract-class-vs-trait)
3. [Fitur bahasa yang sering muncul](#3-fitur-bahasa-yang-sering-muncul)
4. [SOLID](#4-solid)
5. [Design pattern](#5-design-pattern)
6. [Fitur baru PHP 8.4, 8.5, 8.6](#6-fitur-baru-php-84-85-86)
7. [Unit test dengan PHPUnit 12](#7-unit-test-dengan-phpunit-12)
8. [Pertanyaan interview](#8-pertanyaan-interview)

---

## 1. Empat pilar OOP

Contoh domainnya pembayaran: ada uang, rekening, dan beberapa metode bayar.

### Encapsulation

Data dan aturan yang menjaga data itu ada di satu tempat. Dari luar, state cuma bisa berubah lewat method yang menjamin aturannya tetap benar.

- [`Money`](src/Oop/Encapsulation/Money.php) adalah value object. Constructor-nya `private`, jadi satu-satunya cara bikin adalah `Money::of()` yang memvalidasi input. Semua property `readonly`, setiap operasi (`add`, `subtract`) mengembalikan object baru.
- [`BankAccount`](src/Oop/Encapsulation/BankAccount.php) punya `public private(set) Money $balance`. Saldo bisa dibaca dari luar tapi cuma bisa diubah lewat `deposit()`/`withdraw()`, yang menolak saldo minus.

```php
final class BankAccount
{
    public private(set) Money $balance;   // baca: publik, tulis: cuma dari dalam class
}
$account->balance->amount;                // boleh
$account->balance = Money::of(1);         // Error: Cannot modify private(set) property
```

Dulu ini butuh `private $balance` + `getBalance()`. Sekarang lebih ringkas tanpa mengorbankan encapsulation.

Kenapa uang pakai `int`? Float tidak bisa menyimpan 0.1 dengan tepat. Simpan satuan terkecil (rupiah/sen) sebagai integer, persen pakai basis point (250 = 2.5%).

### Abstraction

Pemanggil cukup tahu *apa* yang bisa dilakukan, bukan *bagaimana*.

[`PaymentMethod`](src/Oop/Abstraction/PaymentMethod.php) adalah abstract class dengan satu method publik `pay()`. Pemanggil tidak perlu tahu soal hitungan fee atau validasi tiap metode.

### Inheritance

[`CreditCard`](src/Oop/Abstraction/CreditCard.php), [`EWallet`](src/Oop/Abstraction/EWallet.php), dan [`BankTransfer`](src/Oop/Abstraction/BankTransfer.php) extend `PaymentMethod`. Alurnya di parent, subclass cuma mengisi bagian yang beda:

```php
abstract class PaymentMethod
{
    final public function pay(Money $amount): Receipt   // final: alur tidak boleh diubah
    {
        $this->validate($amount);                        // hook, boleh di-override
        $fee = $this->fee($amount);                      // abstract, wajib diisi subclass
        ...
    }
}
```

Ini pola **Template Method**. `EWallet` override `validate()` dan memanggil `parent::validate()` dulu (sama seperti `super.validate()` di Java).

PHP cuma punya single inheritance untuk class, sama seperti Java.

### Polymorphism

[`Checkout`](src/Oop/Abstraction/Checkout.php) menerima `array<PaymentMethod>` dan memanggil `pay()` tanpa peduli class konkretnya. Tambah metode bayar baru cukup bikin class baru, `Checkout` tidak diubah. Di test juga ada contoh *anonymous class* untuk subclass sekali pakai.

PHP **tidak punya method overloading** (dua method nama sama, parameter beda). Polymorphism di PHP itu overriding + interface. Gantinya overloading: parameter default, union type (`int|string`), atau variadic (`...$args`).

---

## 2. Interface vs abstract class vs trait

| | Interface | Abstract class | Trait |
|---|---|---|---|
| Bisa jadi tipe (`instanceof`, type hint) | Ya | Ya | **Tidak** |
| Punya state (property) | Cuma deklarasi property (8.4) | Ya | Ya |
| Punya implementasi method | Tidak | Ya | Ya |
| Berapa yang boleh dipakai satu class | Banyak | Satu | Banyak |
| Kapan dipakai | Kontrak, titik tukar implementasi | Kerangka bersama + kontrak | Reuse kode lintas hierarki |

Contoh di kode:

- Interface: [`Discount`](src/Oop/Interfaces/Discount.php) dengan implementasi `PercentageDiscount`, `FixedDiscount`, `NoDiscount` (Null Object), dan `StackedDiscount` (Composite, kumpulan diskon yang juga sebuah diskon).
- Trait: [`HasLogger`](src/Oop/Traits/HasLogger.php) punya property dan method abstract yang wajib diisi pemakainya. [`Greeter`](src/Oop/Traits/Greeter.php) menunjukkan cara resolve konflik kalau dua trait punya method yang sama:

```php
use SaysHelloInIndonesian, SaysHelloInEnglish {
    SaysHelloInIndonesian::hello insteadof SaysHelloInEnglish;
    SaysHelloInEnglish::hello as helloEnglish;
}
```

Trait itu pada dasarnya *copy-paste yang dibantu compiler*. Jangan pakai trait untuk sesuatu yang harusnya dependency (misalnya akses DB), karena tidak bisa di-mock dan tidak kelihatan di constructor.

---

## 3. Fitur bahasa yang sering muncul

| Konsep | File | Inti |
|---|---|---|
| Enum | [`OrderStatus`](src/Oop/Enums/OrderStatus.php), [`Order`](src/Oop/Enums/Order.php) | Backed enum, method, konstanta, implement interface, dipakai sebagai state machine dengan `match` |
| Late static binding | [`Model`](src/Oop/StaticBinding/Model.php) | `new static()` vs `new self()`. Alasan `User::create()` di Eloquent mengembalikan `User`, bukan `Model` |
| Magic method | [`Config`](src/Oop/Magic/Config.php) | `__get`, `__set`, `__isset`, `__call`, `__callStatic`, `__invoke`, `__toString`. Laravel Facade dan atribut Eloquent dibangun di atas ini |
| Property hooks | [`Product`](src/Oop/PropertyHooks/Product.php) | `set` hook buat normalisasi/validasi, virtual property `priceWithTax` cuma punya `get` |
| Interface property | [`HasSku`](src/Oop/PropertyHooks/HasSku.php) | Interface boleh mewajibkan property `{ get; }` |

`match` vs `switch`: `match` itu ekspresi (punya nilai), bandingnya strict (`===`), tidak ada fall-through, dan kalau tidak ada cabang yang cocok dia lempar `UnhandledMatchError`. Jadi kalau enum dapat case baru dan lupa ditangani, langsung ketahuan.

`self` vs `static`: `self` mengacu ke class tempat kode *ditulis*, `static` ke class yang *dipanggil* saat runtime.

---

## 4. SOLID

| Prinsip | Artinya | Contoh |
|---|---|---|
| **S**ingle Responsibility | Satu class, satu alasan untuk berubah | [`InvoiceCalculator`](src/Solid/InvoiceCalculator.php) cuma menghitung. Kirim email urusan [`InvoiceMailer`](src/Solid/InvoiceMailer.php) |
| **O**pen/Closed | Terbuka untuk ditambah, tertutup untuk diubah | Metode bayar baru atau kurir baru = class baru, `Checkout`/`ShippingCalculator` tidak disentuh |
| **L**iskov Substitution | Subtipe harus bisa menggantikan parent tanpa bikin kaget | `Square extends Rectangle` itu contoh pelanggaran klasik. Solusinya [`Rectangle`](src/Solid/Rectangle.php) dan [`Square`](src/Solid/Square.php) sejajar di bawah [`Shape`](src/Solid/Shape.php) |
| **I**nterface Segregation | Interface kecil dan spesifik | [`Notifier`](src/Solid/Notifier.php) cuma punya `send()` |
| **D**ependency Inversion | Modul tingkat tinggi bergantung ke abstraksi | `InvoiceMailer` minta `Notifier` (interface) lewat constructor, bukan `new SmtpMailer()` di dalam |

DIP itu yang bikin unit test gampang: di test, `Notifier` diganti mock atau fake.

---

## 5. Design pattern

| Pattern | File | Dipakai di Laravel untuk |
|---|---|---|
| Strategy | [`Patterns/Strategy`](src/Patterns/Strategy) | Driver cache/queue/mail/filesystem |
| Factory | [`PaymentMethodFactory`](src/Patterns/Factory/PaymentMethodFactory.php) | `Model::factory()`, `Auth::guard()` |
| Decorator | [`RetryingNotifier`](src/Patterns/Decorator/RetryingNotifier.php), [`LoggingNotifier`](src/Patterns/Decorator/LoggingNotifier.php) | Middleware (konsepnya mirip), `Cache::remember` |
| Observer | [`EventDispatcher`](src/Patterns/Observer/EventDispatcher.php) | Event & Listener, model observer |
| Builder (immutable) | [`SqlBuilder`](src/Patterns/Builder/SqlBuilder.php) | Query Builder (versi Laravel *mutable*) |
| Template Method | [`PaymentMethod`](src/Oop/Abstraction/PaymentMethod.php) | `Command::handle()`, `FormRequest` |
| Null Object | [`NoDiscount`](src/Oop/Interfaces/NoDiscount.php) | `NullHandler` di logging |
| Composite | [`StackedDiscount`](src/Oop/Interfaces/StackedDiscount.php) | Validation rule bertumpuk |
| DI container | [`Container`](src/Patterns/Container/Container.php) | Service container |

### Mini DI container

[`Container`](src/Patterns/Container/Container.php) adalah versi kecil service container Laravel (sekitar 100 baris): `bind`, `singleton`, autowiring constructor lewat `ReflectionClass`, plus deteksi circular dependency. Bagus buat menjawab "jelaskan cara kerja dependency injection di Laravel/Spring":

1. Baca parameter constructor lewat Reflection.
2. Untuk tiap parameter bertipe class/interface, resolve secara rekursif.
3. Interface wajib punya binding. Class konkret bisa di-autowire tanpa binding.
4. Singleton disimpan setelah dibuat pertama kali.

Bedanya dengan Spring: Spring scan semua bean saat startup (fail fast), Laravel resolve saat diminta (lazy).

---

## 6. Fitur baru PHP 8.4, 8.5, 8.6

| Versi | Fitur | Di mana |
|---|---|---|
| 8.4 | Property hooks | [`Product`](src/Oop/PropertyHooks/Product.php) |
| 8.4 | Asymmetric visibility `public private(set)` | [`BankAccount`](src/Oop/Encapsulation/BankAccount.php) |
| 8.4 | `new Foo()->bar()` tanpa kurung tambahan | Banyak di test |
| 8.4 | Lazy objects (`newLazyGhost`) | [`LazyLoading`](src/Modern/LazyLoading.php). Mekanisme lazy proxy ORM, sama konsepnya dengan proxy Hibernate |
| 8.5 | Pipe operator `\|>` | [`Pipeline::slug`](src/Modern/Pipeline.php) |
| 8.5 | `clone($obj, ['prop' => ...])` | [`SqlBuilder`](src/Patterns/Builder/SqlBuilder.php) |
| 8.5 | `#[\NoDiscard]` | [`Pipeline::discounted`](src/Modern/Pipeline.php) |
| 8.5 | `array_first()`, `array_last()` | [`Pipeline::firstAndLast`](src/Modern/Pipeline.php) |
| 8.6 | Partial function application `f(?, 2)` | [`Pipeline::invoiceNumbers`](src/Modern/Pipeline.php) |
| 8.6 | `clamp($value, $min, $max)` | [`PercentageDiscount`](src/Oop/Interfaces/PercentageDiscount.php), [`Pipeline`](src/Modern/Pipeline.php) |

```php
$slug = $title |> trim(...) |> strtolower(...);    // 8.5: baca kiri ke kanan
$pad  = str_pad(?, 6, '0', STR_PAD_LEFT);           // 8.6: Closure dengan 1 parameter
array_map(clamp(?, 0, 100), $scores);               // 8.6
```

Jebakan `clone with`: property `readonly` itu implisit `protected(set)`. Jadi `clone($note, ['id' => 5])` dari *luar* class gagal. Sediakan method `withId()` di dalam class. Ini ketemu beneran waktu nulis bagian Laravel, lihat `NoteData::withId()`.

---

## 7. Unit test dengan PHPUnit 12

PHPUnit 12 sudah full attribute, docblock annotation (`@test`, `@dataProvider`) tidak didukung lagi.

| JUnit 5 | PHPUnit 12 |
|---|---|
| `@Test` | `#[Test]` atau nama method diawali `test` |
| `@BeforeEach` / `@AfterEach` | `setUp()` / `tearDown()` |
| `@ParameterizedTest` + `@MethodSource` | `#[DataProvider('method')]` (method harus `public static`) |
| `@ValueSource` | `#[TestWith([...])]` |
| `assertThrows` | `$this->expectException(...)` sebelum kode yang dites |
| `@EnabledOnJre` | `#[RequiresPhp('>=8.6.0')]` |
| Mockito `mock()` + `verify()` | `createMock()` + `expects($this->once())` |
| Mockito `when().thenReturn()` | `createStub()` + `method()->willReturn()` |

### Mock, stub, fake

Ditanya hampir di setiap interview:

- **Stub** mengembalikan nilai yang sudah diatur. Tidak peduli dipanggil berapa kali. Pakai `createStub()`.
- **Mock** juga memverifikasi interaksi: dipanggil sekali, dengan argumen tertentu. Pakai `createMock()` + `expects()`.
- **Fake** adalah implementasi beneran yang ringan, misalnya repository in-memory. Biasanya ditulis sendiri, bisa sebagai anonymous class.

Ketiganya ada di [`InvoiceMailerTest`](tests/Solid/InvoiceMailerTest.php) dan [`PatternsTest`](tests/Patterns/PatternsTest.php). Contoh `willReturnOnConsecutiveCalls` untuk menguji retry juga ada di `PatternsTest`.

Aturan praktis: mock untuk hal yang *keluar* dari sistem (kirim email, panggil API), stub/fake untuk hal yang *masuk* (baca data). Terlalu banyak mock bikin test rapuh karena mengunci detail implementasi.

### `assertSame` vs `assertEquals`

`assertSame` pakai `===` (tipe dan identitas object harus sama), `assertEquals` pakai `==` (object dibandingkan isi property-nya). Default pakai `assertSame`, pakai `assertEquals` untuk value object yang beda instance.

---

## 8. Pertanyaan interview

**Apa beda `abstract class` dan `interface`?**
Interface cuma kontrak dan class bisa implement banyak. Abstract class bisa punya state dan implementasi tapi cuma boleh di-extend satu. Pakai interface sebagai tipe untuk dependency, abstract class untuk berbagi kerangka antar subclass yang memang satu keluarga.

**Kapan pakai trait?**
Untuk reuse perilaku yang sama di class yang tidak satu hierarki (misal `HasFactory`, `Notifiable` di Laravel). Jangan pakai trait sebagai pengganti dependency injection.

**`readonly` vs `final`?**
`readonly` di property artinya nilainya cuma bisa di-set sekali. `final` di class artinya tidak bisa di-extend, di method artinya tidak bisa di-override. Konstanta class juga bisa `final` sejak 8.1.

**Kenapa class dibuat `final` secara default?**
Supaya inheritance jadi keputusan sadar. Kalau butuh variasi, lebih aman lewat interface + komposisi. Kelemahannya class `final` tidak bisa di-mock oleh PHPUnit, jadi mock-lah interface-nya.

**Apa itu late static binding?**
`static::` di-resolve ke class yang dipanggil saat runtime, `self::` ke class tempat kode ditulis. Dipakai untuk factory method di parent class yang harus mengembalikan subclass.

**Apa yang terjadi kalau `declare(strict_types=1)` tidak ada?**
PHP akan coba mengonversi tipe skalar diam-diam (misalnya `"5"` jadi `5` untuk parameter `int`). Dengan strict types, salah tipe langsung `TypeError`. Berlakunya per file, di file yang *memanggil*.

**Composition over inheritance itu apa?**
Lebih baik class *punya* object lain (lewat constructor) daripada *mewarisi* class lain. Contohnya decorator `RetryingNotifier` yang membungkus `Notifier`, bukan `class RetryingSmtpNotifier extends SmtpNotifier`.

**Bagaimana PHP mengelola memori?**
Reference counting plus garbage collector untuk siklus. Di PHP-FPM semua dibuang di akhir request, jadi memory leak kecil jarang terasa. Di worker yang jalan lama (queue worker, Octane) baru jadi masalah.
