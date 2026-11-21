# Keputusan desain (js/)

Catatan singkat kenapa bagian JS ditulis seperti sekarang. Format: konteks, keputusan, konsekuensi.

## 1. `core/` ditulis dengan gaya JS native, bukan OOP ala Java

**Konteks.** Versi pertama `core/` membahas 4 pilar OOP, SOLID, dan design pattern GoF pakai class TypeScript. Hasilnya benar secara teknis, tapi isinya "Java yang ditulis ulang di TS". Itu bukan cara kebanyakan kode JS ditulis, dan di interview JS yang ditanya biasanya closure, `this`, prototype, module, immutability, dan event loop.

**Keputusan.** `core/` diorganisir ulang per konsep JS:

| # | Topik | Menggantikan (versi lama) |
|---|---|---|
| 01 | functions | method overloading, utility class |
| 02 | closures | encapsulation pakai class + `#field` |
| 03 | modules | singleton class |
| 04 | object, prototype & this | inheritance, prototype & this |
| 05 | functional | SOLID (S/O), abstract class `Shape` |
| 06 | polymorphism & composition | polymorphism, abstraction, composition, mixin, SOLID (I/D) |
| 07 | async | async & closure |
| 08 | patterns the JS way | design patterns versi class |
| 09 | class yang idiomatis | (baru) kapan class memang pilihan yang tepat |

Tiap file punya catatan pendek **"Kalau dari Java"** supaya tetap nyambung buat orang yang datang dari Spring.

**Konsekuensi.**
- Konsep OOP tetap dibahas, tapi lewat padanan JS-nya (closure = encapsulation, duck typing + lookup table = polymorphism, union + `switch` = hierarki tertutup).
- Class tetap muncul di 04 (untuk menjelaskan bahwa class = sugar prototype) dan 09 (custom `Error`, LRU cache dengan `#private`, extend `EventTarget`).
- Contoh pelanggaran LSP (Square/Rectangle) dibuang dari `core/`. Itu topik OOP umum, sudah dibahas di bagian Java.

## 2. App `nestjs/` tetap berbasis class

**Konteks.** NestJS itu framework yang sengaja meniru Spring: module, provider, decorator, DI container. Class + decorator adalah **konvensi framework-nya**, bukan pilihan gaya kita.

**Keputusan.** `nestjs/` tidak diubah. Class, abstract class sebagai token DI, dan decorator tetap dipakai di sana.

**Konsekuensi.** Repo ini sengaja nunjukin dua dunia: JS polos (function-first) dan JS ber-framework (class-first). Pertanyaan "kenapa NestJS pakai class padahal JS nggak harus?" bisa dijawab dari kode langsung: framework butuh metadata runtime (decorator + `reflect-metadata`) dan token DI yang ada saat runtime, dan `interface` TS hilang setelah compile.

## 3. Tetap TypeScript, tapi *erasable syntax only*

**Konteks.** "Native JS" bisa diartikan sebagai file `.js` polos.

**Keputusan.** Tetap `.ts`, tapi dengan `erasableSyntaxOnly` (tanpa `enum`, tanpa parameter property, tanpa namespace). Node 26 menjalankan file ini langsung lewat *type stripping*, jadi kalau semua type annotation dihapus, sisanya JS biasa yang sama persis.

**Konsekuensi.** Konsisten dengan `nestjs/` (TypeScript), tetap bisa `node src/demo.ts` tanpa build, dan type annotation berfungsi sebagai dokumentasi yang dicek compiler.

## 4. CI khusus `js/`

**Keputusan.** Workflow [`.github/workflows/js.yml`](../.github/workflows/js.yml) hanya jalan kalau ada perubahan di `js/**` (atau workflow-nya sendiri). Dua job paralel di Node 26:
- `core`: `npm ci`, typecheck, prettier check, test, dan menjalankan demo (memastikan type stripping masih jalan).
- `nestjs`: `npm ci`, lint (oxlint), build, unit test, e2e test.

**Konsekuensi.** Perubahan di bahasa lain nggak memicu CI JS, dan sebaliknya.
