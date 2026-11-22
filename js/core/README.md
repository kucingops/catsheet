# JS Core: fundamental JS yang idiomatis (TypeScript murni, tanpa framework)

Folder ini nunjukin cara **JS sendiri** menyelesaikan masalah yang di Java biasanya diselesaikan pakai class: function, closure, module, prototype, data + function, dan async. Class tetap ada, tapi cuma di tempat yang memang lumrah di JS (lihat file 09). Di tiap file ada catatan pendek **"Kalau dari Java"** buat jembatan mental model.

Tiap topik = satu file `src/NN-topik.ts` (kode + komentar penjelasan) dan satu `src/NN-topik.spec.ts` (test yang sekaligus jadi "bukti" perilakunya). Baca kodenya dulu, lalu test-nya.

```bash
npm i
npm test           # 61 test, < 1 detik
npm run typecheck  # tsc --noEmit
npm run demo       # = node src/demo.ts, jalan langsung tanpa build
```

> Kode di folder ini sengaja ditulis pakai *erasable syntax only* (nggak ada `enum`, nggak ada parameter property `constructor(private x)`), supaya bisa dieksekusi langsung oleh Node 26 lewat type stripping. Type annotation cuma "dokumentasi yang dicek compiler"; kalau dihapus, sisanya JS biasa.

## Daftar isi

| # | File | Inti | Pertanyaan interview yang sering keluar |
|---|---|---|---|
| 01 | [functions](src/01-functions.ts) | function = value, arrow vs declaration, options object + default (pengganti overloading), higher-order, currying, `pipe`, pure function | "Apa itu higher-order function?" |
| 02 | [closures](src/02-closures.ts) | factory function + closure = private state beneran, `memoize`, `once`, gotcha `var` vs `let` di loop | "Jelaskan closure. Output loop `var` ini apa?" |
| 03 | [modules](src/03-modules.ts) | ESM: yang nggak di-export = privat, module di-cache = singleton gratis, named vs default export, dynamic `import()` | "Singleton di Node gimana?" |
| 04 | [object, prototype & this](src/04-objects-prototypes-this.ts) | object literal, spread/destructuring, `Object.create`, class = sugar prototype, aturan `this`, `call`/`apply`/`bind`, shallow vs deep copy | "Kenapa `this` undefined?" |
| 05 | [functional](src/05-functional.ts) | `map`/`filter`/`reduce`, rules sebagai function, update immutable, `toSorted`/`Object.groupBy`, discriminated union + exhaustive `switch`, `Result`, generator | "Mutable vs immutable? Kenapa?" |
| 06 | [polymorphism & composition](src/06-polymorphism-and-composition.ts) | duck/structural typing, lookup table function, gabung kemampuan (bukan inherit), DI = parameter factory, mock = object literal | "Composition over inheritance di JS?" |
| 07 | [async](src/07-async.ts) | event loop, microtask vs macrotask, `promisify`, sekuensial vs paralel, `allSettled`, batas konkurensi, `AbortSignal` timeout, retry, async generator | "Urutan output kode ini apa?" |
| 08 | [patterns the JS way](src/08-patterns-the-js-way.ts) | strategy = function, observer = `EventEmitter`/`EventTarget`, decorator = HOF, builder = options object, middleware chain | "Design pattern apa yang kamu pakai di Node?" |
| 09 | [class yang idiomatis](src/09-classes-when-idiomatic.ts) | custom `Error`, struktur data dengan `#private` (LRU), extend `EventTarget`, kapan class *nggak* perlu | "Kapan pakai class di JS?" |

## Peta cepat: konsep Java -> cara JS

| Di Java | Cara idiomatis di JS | File |
|---|---|---|
| class + `private` field + getter | factory function + closure, atau `#field` kalau memang butuh class | 02, 09 |
| `static` utility class | `export function` di module | 01, 03 |
| Singleton `getInstance()` | module (dievaluasi sekali, di-cache) | 03 |
| Method overloading / Builder | satu function + options object dengan default | 01, 08 |
| `interface` + beberapa `Impl` | tipe (opsional) + object literal; duck typing | 06 |
| Abstract class + subclass (`Shape`) | discriminated union + `switch` | 05 |
| Strategy / Command | function sebagai argumen, atau `Record<string, fn>` | 06, 08 |
| Decorator pattern | higher-order function | 08 |
| `@Autowired` constructor injection | dependency sebagai parameter factory | 06 |
| Mockito | object literal + `vi.fn()` | 06 |
| Checked exception untuk error yang diharapkan | `Result` `{ ok, value \| error }` | 05 |
| Stream API | method array bawaan + generator | 05 |
| `CompletableFuture`, thread pool | `Promise`, `Promise.all`, batas konkurensi manual | 07 |
| `extends RuntimeException` | `extends Error` (ini tetap class, dan memang lumrah) | 09 |

## Ringkasan konsep (versi santai)

### Closure = private-nya JS

```ts
function createCounter() {
  let n = 0;               // nggak bisa diakses dari luar
  return { inc: () => ++n, get: () => n };
}
```

Bonus: method dari closure **nggak pakai `this`**, jadi aman dioper sebagai callback (`[1, 2].forEach(acc.deposit)`).

### `this` (paling sering bikin bingung anak Java)

`this` ditentukan **cara function dipanggil**, bukan tempat function ditulis.

```ts
const c = new Counter(0);
const f = c.increment;
f();                             // TypeError: this undefined
setTimeout(c.increment);         // sama, this hilang
setTimeout(() => c.increment()); // aman
setTimeout(c.increment.bind(c)); // aman
```

### Immutability

Update = bikin object/array baru (`{ ...obj, x: 1 }`, `arr.map(...)`, `arr.toSorted()`), bukan mutasi. `Object.freeze` itu **shallow**. Di TS, `readonly` cuma dicek compiler.

### Event loop (urutan yang harus hafal)

```
sync code -> process.nextTick -> Promise microtask -> timer (setTimeout) -> I/O -> setImmediate
```

Gotcha: kalau kode dijalankan **dari dalam** microtask (misal setelah `await` atau di top-level ESM), `nextTick` baru diproses setelah antrian promise habis. Ada test-nya di file 07.

### Testing di sini

- `vi.fn()` = `Mockito.mock()`. `toHaveBeenCalledWith` = `verify(...)`.
- Dependency (waktu, repo, logger) dioper sebagai parameter, jadi test tinggal oper versi palsu. Nggak perlu framework DI atau mocking library.
- `@ts-expect-error` dipakai di test untuk membuktikan sesuatu **ditolak compiler**.

Kenapa folder ini ditulis begini (dan kenapa app NestJS tetap pakai class): lihat [../DECISIONS.md](../DECISIONS.md).
