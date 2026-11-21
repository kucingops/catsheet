# JS Core: OOP & fundamental (TypeScript murni, tanpa framework)

Tiap topik = satu file `src/NN-topik.ts` (kode + komentar penjelasan) dan satu `src/NN-topik.spec.ts` (test yang sekaligus jadi "bukti" perilakunya). Baca kodenya dulu, lalu test-nya.

```bash
npm i
npm test           # 45 test, < 1 detik
npm run typecheck  # tsc --noEmit
npm run demo       # = node src/demo.ts, jalan langsung tanpa build
```

> Kode di folder ini sengaja ditulis pakai *erasable syntax only* (nggak ada `enum`, nggak ada parameter property `constructor(private x)`), supaya bisa dieksekusi langsung oleh Node 26 lewat type stripping. Di app NestJS, fitur itu boleh dipakai karena di-compile `tsc`.

## Daftar isi

| # | File | Inti | Pertanyaan interview yang sering keluar |
|---|---|---|---|
| 01 | [encapsulation](src/01-encapsulation.ts) | `#field` vs `private`, getter tanpa setter, defensive copy, static factory, brand check `#x in obj` | "Bedanya `private` TS dan `#private`?" |
| 02 | [inheritance](src/02-inheritance.ts) | `extends`, `super`, `protected`, `override`, static, extend `Error` | "Kenapa harus panggil `super()` dulu sebelum `this`?" |
| 03 | [polymorphism](src/03-polymorphism.ts) | subtype, structural typing, overload signature, generics dengan bound | "TS bisa overloading?" |
| 04 | [abstraction](src/04-abstraction.ts) | abstract class vs interface, template method | "Kapan abstract class, kapan interface?" |
| 05 | [composition](src/05-composition.ts) | has-a vs is-a, constructor injection, mixin | "Kenapa composition over inheritance?" |
| 06 | [SOLID](src/06-solid.ts) | satu contoh per prinsip, termasuk pelanggaran LSP (Square/Rectangle) | "Jelaskan SOLID dengan contoh" |
| 07 | [prototype & this](src/07-prototype-and-this.ts) | class = sugar prototype, `this` hilang di callback, `bind`/arrow | "Kenapa `this` undefined?" |
| 08 | [design patterns](src/08-design-patterns.ts) | singleton, factory, strategy, observer (EventEmitter), decorator, builder | "Singleton di Node gimana?" |
| 09 | [async & closure](src/09-async-and-closure.ts) | event loop, microtask vs macrotask, `Promise.all` vs `allSettled`, timeout, closure | "Urutan output kode ini apa?" |

## Ringkasan konsep (versi santai)

### 4 pilar OOP

- **Encapsulation**: data + aturan main dibungkus jadi satu. Orang luar nggak bisa ubah state sembarangan, harus lewat method yang ngecek aturan. Di JS, pakai `#field` kalau mau private beneran. `private` milik TypeScript cuma "pagar di compiler", setelah jadi JS tetap kebaca.
- **Inheritance**: class anak mewarisi perilaku class induk (`extends`). Satu induk saja. Pakai hemat-hemat karena bikin coupling kuat.
- **Polymorphism**: satu "bentuk" (tipe `Shape`), banyak perilaku (`Circle.area()`, `Rectangle.area()`). Caller nggak perlu `if instanceof`. TypeScript juga punya *structural typing*: object apa pun yang bentuknya cocok dianggap tipe itu, nggak perlu `implements`.
- **Abstraction**: sembunyikan detail, tampilkan kontrak. `abstract class` untuk kontrak + kode bersama, `interface` untuk kontrak murni.

### Abstract class vs interface (versi TS)

| | `interface` | `abstract class` |
|---|---|---|
| Ada di runtime? | Tidak (hilang setelah compile) | Ya |
| Boleh punya implementasi/state? | Tidak | Ya |
| Bisa `instanceof`? | Tidak | Ya |
| Bisa jadi token DI NestJS? | Tidak (harus pakai string/Symbol token) | Ya |
| Berapa yang bisa dipakai satu class? | Banyak (`implements A, B`) | Satu (`extends`) |

### `this` di JS (paling sering bikin bingung anak Java)

`this` ditentukan **cara function dipanggil**, bukan tempat function ditulis.

```ts
const c = new Counter(0);
const f = c.increment;
f();                       // TypeError: this undefined
setTimeout(c.increment);   // sama, this hilang
setTimeout(() => c.increment()); // aman
setTimeout(c.increment.bind(c)); // aman
```

### Event loop (urutan yang harus hafal)

```
sync code -> process.nextTick -> Promise microtask -> timer (setTimeout) -> I/O -> setImmediate
```

Gotcha: kalau kode dijalankan **dari dalam** microtask (misal setelah `await` atau di top-level ESM), `nextTick` baru diproses setelah antrian promise habis. Ada test-nya di file 09.

### Testing di sini

- `vi.fn()` = `Mockito.mock()`. `toHaveBeenCalledWith` = `verify(...)`.
- `vi.useFakeTimers()` + `vi.setSystemTime()` untuk kode yang bergantung waktu. Tapi lebih bagus lagi: inject `Clock` (lihat SOLID bagian D), jadi nggak perlu "nge-hack" waktu global.
- `@ts-expect-error` dipakai di test untuk membuktikan sesuatu **ditolak compiler** (misal `new AbstractClass()`).
