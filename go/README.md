# Go cheatsheet (Go 1.27 + Gin 1.12)

Cheatsheet Go dari sudut pandang orang Java/Spring. Isinya kode yang bisa dijalankan dan di-test, plus penjelasan santai kenapa Go melakukan sesuatu dengan cara yang beda.

```
go/
├── core/idiomatic/      # gaya Go asli: struct, error, interface kecil, options, iter, goroutine
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

## Go itu bahasa apa?

Jawaban singkat buat interview: **Go itu bahasa prosedural (imperatif) dengan struct, method, interface, dan komposisi.** Bukan OOP berbasis class seperti Java, tapi juga **bukan bahasa functional**. Fungsi memang first-class (bisa dioper, dikembalikan, jadi closure), dan itu dipakai banyak di Go, tapi data umumnya mutable, loop `for` biasa itu normal, dan tidak ada map/filter/reduce bawaan di slice. Kalau ditanya "Go itu OOP atau functional?", jawaban yang aman: *"Go mengambil sedikit dari keduanya (method + interface, fungsi first-class), tapi gayanya sendiri: data sederhana, error sebagai nilai, komposisi, dan concurrency lewat goroutine + channel."*

Karena itu contoh di [`core/idiomatic`](core/idiomatic) tidak mencoba menerjemahkan 4 pilar OOP ke Go. Isinya kebiasaan yang memang dipakai orang Go sehari-hari:

| File | Kebiasaan Go | Kira-kira menggantikan (Java) |
|---|---|---|
| [structs.go](core/idiomatic/structs.go) | struct biasa, field exported tanpa getter/setter, **zero value yang langsung bisa dipakai**, constructor cuma kalau ada validasi, embedding | class + constructor + getter/setter, `extends` |
| [errors.go](core/idiomatic/errors.go) | **error sebagai nilai**: sentinel + `errors.Is`, error bertipe + `errors.As`, wrap dengan `%w`, `errors.Join`, jebakan typed nil | exception, try/catch, `@ControllerAdvice` |
| [interfaces.go](core/idiomatic/interfaces.go) | **interface kecil yang didefinisikan pemakainya**, implementasi implisit, `io.Reader`/`io.Writer`, fake tanpa mock framework, type switch | `interface` + `Impl`, Mockito, `instanceof` |
| [options.go](core/idiomatic/options.go) | **functional options** `NewClient(url, WithTimeout(..))` | Builder, constructor overload |
| [middleware.go](core/idiomatic/middleware.go) | fungsi membungkus fungsi: middleware `func(http.Handler) http.Handler`, closure, retry | Filter, interceptor, AOP `@Around` |
| [iter.go](core/idiomatic/iter.go) | iterator `iter.Seq`, range-over-func, lazy dan bisa berhenti lebih awal | Stream, Iterator |
| [concurrency.go](core/idiomatic/concurrency.go) | goroutine + channel, fan-out/fan-in, `context` untuk cancel, `WaitGroup.Go` | ExecutorService, CompletableFuture |

### Kalau dari Java

Beberapa refleks Java yang sebaiknya ditinggal waktu nulis Go:

- **Jangan bikin interface duluan.** Tulis struct konkret. Interface muncul nanti, di sisi yang butuh, dan biasanya cuma 1–2 method. Contoh nyata: `emailLookup` di interfaces.go, `store.NoteRepository` di app Gin.
- **Jangan getter/setter untuk semua field.** Field exported itu normal. Unexported + method cuma kalau ada aturan yang dijaga (lihat `Money`).
- **Jangan cari inheritance.** Embedding itu komposisi yang menyingkat penulisan, bukan subtype. `Derived{}.Describe()` di structs.go tetap memanggil `Base.Kind`, karena tidak ada virtual dispatch.
- **Jangan lempar, kembalikan.** `if err != nil { return fmt.Errorf("konteks: %w", err) }` itu memang gaya Go. `panic` cuma untuk bug programmer.
- **Jangan pakai framework DI.** Constructor biasa + wiring manual di `main.go` (lihat `gin/cmd/server/main.go`).
- **Jangan paksa rantai stream.** Loop `for` biasa itu idiomatis. `iter.Seq` dipakai kalau memang butuh lazy atau sumbernya besar.

### Jebakan yang sering ditanya

1. **Interface berisi nil pointer bukan nil.** `var p *MyErr; var err error = p; err != nil` → `true`. Lihat `FindBuggy` vs `FindFixed` di errors.go.
2. **Value vs pointer receiver.** Receiver `T` bekerja pada salinan. Pakai pointer kalau method mengubah state, struct-nya besar, atau berisi `sync.Mutex`. Method set `T` tidak termasuk method `*T`.
3. **Map tidak thread-safe.** Akses bareng = data race, bahkan bisa `fatal error: concurrent map writes`. Pakai mutex (lihat `Counter`) dan jalankan `go test -race`.
4. **Urutan iterasi map itu acak** (sengaja). Butuh urut? `slices.Sorted(maps.Keys(m))`.
5. **Goroutine bocor.** Goroutine yang menunggu channel selamanya tidak pernah di-GC. Selalu sediakan jalan keluar lewat `ctx.Done()` (lihat `Generate`).
6. **Visibility per package**, bukan per type.

### Pertanyaan interview yang umum + jawaban singkat

- **Kenapa Go tidak punya inheritance?** Inheritance bikin coupling kuat (fragile base class). Go memilih komposisi + interface, prinsip yang di Java pun dianjurkan ("favor composition over inheritance").
- **Kenapa interface didefinisikan di sisi pemakai?** Karena implementasinya implisit, pemakai bisa minta tepat method yang dia butuhkan. Hasilnya interface kecil, mudah di-fake di test, dan package implementasi tidak perlu tahu siapa pemakainya.
- **Error vs panic?** `error` untuk kondisi yang bisa diprediksi (input salah, data tidak ada, DB down). `panic` untuk bug. Gin `Recovery()` menangkap panic supaya server tidak mati.
- **Bagaimana DI di Go?** Constructor injection manual. Proyek besar: `google/wire` (generate kode) atau `uber-go/fx` (runtime, mirip Spring).
- **`context.Context` buat apa?** Membawa deadline, sinyal cancel, dan nilai per-request. Konvensinya parameter pertama. Di Java hal serupa biasanya disembunyikan di `ThreadLocal`.
- **Channel atau mutex?** Channel untuk mengoper kepemilikan data atau mengatur alur antar goroutine. Mutex untuk melindungi state kecil. Dua-duanya idiomatis.

Alasan di balik pilihan-pilihan ini ada di [DECISIONS.md](DECISIONS.md).

## Fitur Go modern yang dipakai di sini

| Fitur | Sejak | Dipakai di |
|---|---|---|
| `errors.Join` | 1.20 | core/idiomatic/errors.go |
| `for i := range 10` | 1.22 | core/idiomatic tests, store tests |
| iterator `iter.Seq`, range-over-func, `maps.Keys`, `slices.Collect` | 1.23 | core/idiomatic/iter.go, store/memory.go |
| `t.Context()`, `b.Loop()`, `crypto/rand.Text()` | 1.24 | contract test, benchmark, session ID |
| `strings.FieldsSeq` | 1.24 | core/idiomatic/iter.go |
| `testing/synctest` (jam palsu di test) | 1.25 | auth/session_test.go |
| `sync.WaitGroup.Go` | 1.25 | core/idiomatic/concurrency.go, store/memory_test.go |
