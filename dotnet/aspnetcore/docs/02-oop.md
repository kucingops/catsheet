# 02 · OOP di C# (dengan contoh dari domain repo ini)

Domain-nya mini toko online: `Product` (fisik/digital), `Order`, `Money`, dan strategi diskon. Semua ada di `src/Catsheet.Domain`, project yang sengaja **tanpa dependency framework** (bahkan tanpa ASP.NET Core). Jadi OOP-nya murni.

## 4 pilar

### 1. Encapsulation
State cuma boleh berubah lewat method yang menjaga aturan bisnis.

```csharp
public int Stock
{
    get;
    private set => field = value >= 0 ? value : throw new DomainException("Stok tidak boleh negatif.");
}

public void Restock(int qty) { if (qty <= 0) throw ...; Stock += qty; }
```

- Setter `private`, jadi `product.Stock = -5` **tidak compile**.
- `Order` menyimpan `List<OrderLine>` secara private dan cuma mengekspos `IReadOnlyList<OrderLine>` (`_lines.AsReadOnly()`). Kalau di-cast ke `IList` lalu `Clear()`, hasilnya `NotSupportedException`. Ada test-nya.
- Java: sama saja, cuma di C# property bikin kodenya lebih pendek dan validasi bisa ditaruh di setter.

> Pertanyaan interview: *"Kenapa tidak public setter saja lalu validasi di service?"* Karena invariant jadi tersebar dan bisa dilewati. Domain object yang menjaga dirinya sendiri = **rich domain model** (lawannya *anemic domain model*).

### 2. Inheritance
```
Entity<TId>   (abstract, generic: equality by Id)
  └── Product (abstract: Name, Price, Stock, Reserve(), ShippingCost() abstract)
        ├── PhysicalProduct (sealed: WeightKg, ongkir per kg)
        └── DigitalProduct  (sealed: DownloadUrl, stok tak terbatas, ongkir 0)
```
- `: base(...)` = `super(...)`.
- `sealed` = `final class`. Default C# class **tidak sealed**, tapi method **tidak virtual**. Ini kebalikan Java, di mana semua method virtual by default.
- `virtual` / `override` wajib ditulis eksplisit. Kalau lupa `override` dan nama method sama, yang terjadi adalah **method hiding** (`new`), bukan override. Gotcha klasik.

### 3. Polymorphism
- **Subtype (runtime)**: `product.ShippingCost()` memanggil implementasi sesuai tipe runtime. `Order.AddItem` tidak pernah `if (product is PhysicalProduct)`.
- **Lewat interface**: `IDiscountPolicy` punya 4 implementasi (`NoDiscount`, `PercentageDiscount`, `BuyNGetOneFree`, `HappyHourDiscount`). `Order` cuma tahu interface-nya.
- **Ad-hoc / overloading**: `Money * int` dan `Money * decimal` (operator overloading).
- **Parametric (generics)**: `Entity<TId> where TId : notnull`.

### 4. Abstraction
- `abstract class Product`: ada state bersama dan template method (`Reserve`), dengan hook `HasUnlimitedStock` yang di-override `DigitalProduct`.
- `interface IProductRepository`: kontrak saja. Implementasinya ada tiga (in-memory, EF Core, ADO.NET) di project Api.

**Abstract class vs interface (sering ditanya):**

| | abstract class | interface |
|---|---|---|
| State (field) | Boleh | Tidak (hanya static) |
| Constructor | Ada | Tidak |
| Multiple | Single inheritance | Bisa implement banyak |
| Default method | Ya | Ya (C# 8, `Describe()` di `IDiscountPolicy`) |
| Kapan | Ada perilaku + state bersama ("is-a") | Kemampuan/kontrak ("can-do"), untuk DI dan mock |

## SOLID, dipetakan ke kode

| Prinsip | Di mana |
|---|---|
| **S**ingle Responsibility | `Money` cuma urusan uang. `CatalogService` cuma orkestrasi. Mapping SQL ada di repository. |
| **O**pen/Closed | Diskon baru = class baru yang implement `IDiscountPolicy`. `Order` tidak diubah. |
| **L**iskov Substitution | `ProductRepositoryContract` (test): 3 implementasi lolos test yang **sama**. |
| **I**nterface Segregation | `IUserStore` cuma punya `ValidateCredentials`, tidak dicampur CRUD user. |
| **D**ependency Inversion | Domain mendefinisikan `IProductRepository`. Infrastruktur (EF/ADO) yang menyesuaikan. |

## Design pattern yang muncul

| Pattern | File |
|---|---|
| Strategy | `IDiscountPolicy` + implementasinya |
| Decorator | `HappyHourDiscount` membungkus policy lain |
| Template Method | `Product.Reserve()` + hook `HasUnlimitedStock`; `AuthenticationHandler<T>.HandleAuthenticateAsync` |
| Factory | `ProductFactory.Create`, `PhysicalProduct.Create` (static factory method) |
| Singleton | `NoDiscount.Instance`; service `AddSingleton` di DI |
| Repository | `IProductRepository` |
| Value Object | `Money` (`readonly record struct`) |
| Aggregate Root | `Order` menjaga `OrderLine` |
| Object Mother / Test Data Builder | `tests/Catsheet.Domain.Tests/TestData.cs` |

## `class` vs `struct` vs `record`

| | `class` | `struct` | `record` (class) | `record struct` |
|---|---|---|---|---|
| Jenis | reference | value | reference | value |
| Equality default | referensi | isi field | isi (value) | isi (value) |
| `null` | bisa | tidak | bisa | tidak |
| Cocok untuk | entity, service | angka kecil, koordinat | DTO, event | value object kecil (`Money`) |

**Entity vs Value Object**: `Product` itu entity, sama kalau `Id`-nya sama walaupun nama berubah. `Money` itu value object, sama kalau isinya sama. Implementasi equality keduanya ada di `Entity<TId>` dan `Money`.

## Composition over inheritance
`HappyHourDiscount` tidak *extends* `PercentageDiscount`. Dia *menerima* `IDiscountPolicy inner`. Hasilnya bisa happy hour + diskon apa pun, tanpa ledakan subclass (`HappyHourPercentage`, `HappyHourBuyNGetOne`, ...).
