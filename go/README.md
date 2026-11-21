# Go cheatsheet (Go 1.27 + Gin 1.12)

Cheatsheet Go dari sudut pandang orang Java/Spring. Isinya kode yang bisa dijalankan dan di-test, plus penjelasan santai kenapa Go melakukan sesuatu dengan cara yang beda.

```
go/
├── core/oop/            # OOP ala Go, dibandingkan dengan Java
└── gin/                 # REST API pakai Gin
    ├── cmd/server/      # main.go: wiring manual + graceful shutdown
    └── internal/
        ├── domain/      # entity + error bisnis, tanpa dependensi framework
        ├── store/       # persistence: memory, file JSON, SQLite
        ├── service/     # logika bisnis (ownership, validasi, role)
        ├── auth/        # Basic, session, JWT, API key, role check
        └── httpapi/     # route Gin + handler + mapping error ke HTTP
```

Detail security, persistence, dan testing ada di [gin/README.md](gin/README.md).

## Cara jalanin

```bash
cd go
go test ./...                 # semua test
go test -race ./...           # plus deteksi data race
go test -cover ./...          # coverage
go run ./gin/cmd/server       # server di :8080, STORE=memory|file|sqlite
```

`go.mod` minta Go 1.27. Kalau Go lokal lebih lama (minimal 1.21), `go` otomatis download toolchain yang pas (fitur `GOTOOLCHAIN`).

Dependensi sengaja sedikit: Gin, golang-jwt, x/crypto (bcrypt), dan modernc SQLite (pure Go, tanpa CGO, tanpa Docker). Test cuma pakai standard library `testing`, tanpa testify atau gomock, supaya kelihatan bahwa Go sudah cukup dari sananya.

---

## OOP di Go, buat orang Java

Jawaban singkat buat interview: **Go itu object-oriented tanpa class dan tanpa inheritance.** Yang ada struct, method, interface, dan komposisi. Semua contoh di bawah ada kodenya di [`core/oop`](core/oop).

| Konsep | Java | Go | Contoh |
|---|---|---|---|
| Class | `class Account { ... }` | `type Account struct { ... }` + method | [encapsulation.go](core/oop/encapsulation.go) |
| Constructor | `new Account(...)` | fungsi biasa `NewAccount(...)`, konvensi | idem |
| private / public | keyword, per class | huruf kecil / Besar, **per package** | idem |
| Getter | `getOwner()` | `Owner()` (tanpa "Get") | idem |
| `implements` | eksplisit | **implisit**: punya method-nya = memenuhi interface | [interfaces.go](core/oop/interfaces.go) |
| `extends` | inheritance + virtual dispatch | embedding = komposisi, **tanpa** virtual dispatch | [composition.go](core/oop/composition.go) |
| Abstract class / template method | `abstract class` | interface + fungsi yang menerima interface | idem |
| `instanceof` / pattern matching | `if (s instanceof Circle c)` | type switch `switch v := s.(type)` | interfaces.go |
| `this` | implisit | receiver eksplisit `func (a *Account) ...` | [receivers.go](core/oop/receivers.go) |
| Generics | type erasure, `<T extends Comparable<T>>` | tanpa erasure, constraint `cmp.Ordered`, union `~int \| ~float64` | [generics.go](core/oop/generics.go) |
| Exception | `throw` / `try-catch` | `error` sebagai return value, `errors.Is`/`errors.As`, wrap `%w` | encapsulation.go |
| `Optional<T>` | `Optional.empty()` | pola "comma ok": `v, ok := ...` | generics.go (Stack.Pop) |
| `finally` | `try-finally` | `defer` | store/memory.go |

### 4 pilar OOP versi Go

**Encapsulation.** Field huruf kecil tidak bisa diakses dari package lain. `BankAccount.balance` cuma bisa berubah lewat `Deposit`/`Withdraw`, jadi invariant saldo ≥ 0 terjaga. Bedanya dengan Java: batasnya package, bukan type. File lain di package yang sama tetap bisa baca `balance`.

**Abstraction.** Lewat interface kecil. Di Go, interface biasanya didefinisikan di sisi **pemakai**, bukan di sisi implementasi. Contoh nyata: `store.NoteRepository` didefinisikan di package `store` yang dipakai service, dan `rowScanner` di `store/sql.go` didefinisikan cuma buat satu fungsi. Prinsipnya: *accept interfaces, return structs*.

**Inheritance.** Tidak ada. Penggantinya embedding:

```go
type Dog struct {
    Animal        // field & method Animal "dipromosikan" ke Dog
    Breed string
}
d.Introduce()     // memanggil Animal.Introduce
```

Jebakan favorit interviewer: kalau `Animal.Introduce()` memanggil `a.Sound()`, yang terpanggil **tetap `Animal.Sound`**, bukan `Dog.Sound`, karena receiver-nya `Animal`. Tidak ada virtual dispatch, dan `Dog` tidak bisa dipakai di tempat yang butuh `Animal`. Test-nya ada di `TestEmbeddingIsNotInheritance`.

Contoh embedding yang berguna ada di `gin/internal/store/file.go`: `FileNoteRepository` meng-embed `*MemoryNoteRepository`, mewarisi semua method baca, dan cuma "override" method tulis supaya flush ke file.

**Polymorphism.** Lewat interface. `TotalArea(shapes ...Shape)` bisa terima `Rectangle` dan `Circle`. Di app Gin, `NoteService` bisa jalan di atas memory, file, atau SQLite tanpa tahu bedanya, dan middleware `auth.Authenticate` bisa merangkai Basic, session, JWT, dan API key karena semuanya memenuhi `Authenticator`.

### Jebakan yang sering ditanya

1. **Interface berisi nil pointer bukan nil.** `var p *MyErr = nil; var err error = p; err != nil` → `true`. Interface baru nil kalau type *dan* value-nya nil. Lihat `FindBuggy` vs `FindFixed`.
2. **Value vs pointer receiver.** Method dengan receiver `T` bekerja pada salinan. Method set `T` tidak termasuk method `*T`, jadi kalau `IncPointer` pakai pointer receiver, cuma `*Counter` yang memenuhi interface, bukan `Counter`.
3. **Map tidak thread-safe.** Akses bareng dari beberapa goroutine = data race (bahkan bisa crash `fatal error: concurrent map writes`). Pakai `sync.Mutex`/`RWMutex` atau `sync.Map`. Lihat `store/memory.go`, dan jalankan `go test -race`.
4. **Urutan iterasi map itu acak** (sengaja). Kalau butuh urut, sort dulu.
5. **Visibility per package**, bukan per type.

### Pertanyaan interview yang umum + jawaban singkat

- **Kenapa Go tidak punya inheritance?** Inheritance bikin coupling kuat antara parent dan child (fragile base class). Go memilih komposisi + interface, sesuai prinsip "favor composition over inheritance" yang di Java pun dianjurkan.
- **Kapan pakai pointer receiver?** Kalau method mengubah state, struct-nya besar, atau berisi `sync.Mutex`. Konsisten dalam satu type.
- **Bagaimana DI di Go?** Constructor injection manual di `main.go` (lihat `gin/cmd/server/main.go`). Kalau proyek besar: `google/wire` (generate kode) atau `uber-go/fx` (runtime, rasanya mirip Spring).
- **Error vs panic?** `error` untuk kondisi yang bisa diprediksi (input salah, data tidak ada, DB down). `panic` untuk bug programmer yang seharusnya tidak terjadi. Gin `Recovery()` menangkap panic supaya server tidak mati.
- **`context.Context` buat apa?** Membawa deadline, sinyal cancel, dan nilai per-request lintas fungsi dan goroutine. Konvensinya jadi parameter pertama. Di Java hal serupa biasanya disembunyikan di `ThreadLocal`.

## Fitur Go modern yang dipakai di sini

| Fitur | Sejak | Dipakai di |
|---|---|---|
| `for i := range 10` | 1.22 | core/oop generics_test.go, store tests |
| iterator `maps.Values`, `slices.Collect` | 1.23 | store/memory.go |
| `t.Context()`, `b.Loop()`, `crypto/rand.Text()` | 1.24 | contract test, benchmark, session ID |
| `testing/synctest` (jam palsu di test) | 1.25 | auth/session_test.go |
| `sync.WaitGroup.Go` | 1.25 | store/memory_test.go |
| builtin `min`/`max`, package `cmp` | 1.21 | core/oop generics.go |
