# Catatan keputusan (Go)

Kenapa cheatsheet Go ditulis seperti ini. Singkat, satu keputusan per bagian.

## 1. `core/oop` diganti `core/idiomatic`

**Sebelumnya:** `core/oop` memetakan 4 pilar OOP Java ke Go (encapsulation, inheritance lewat embedding, polymorphism, abstraction) plus `Animal`/`Dog`/`Shape`.

**Sekarang:** `core/idiomatic` berisi kebiasaan yang memang dipakai di kode Go: struct + zero value, error sebagai nilai, interface kecil di sisi pemakai, functional options, middleware, `iter.Seq`, goroutine + channel.

**Alasan:** Cheatsheet bahasa lain di repo ini (JS, PHP, .NET) mengikuti gaya asli bahasanya, bukan meniru Java. Go juga harus begitu. Menjelaskan Go lewat kacamata 4 pilar OOP mendorong pola yang justru dihindari orang Go (interface + Impl untuk semua hal, getter/setter, hierarki embedding). Perbandingan dengan Java tetap ada, tapi cukup di bagian "Kalau dari Java" di README.

**Yang dipertahankan:** jebakan embedding tanpa virtual dispatch dan jebakan typed nil, karena dua-duanya sering ditanya di interview.

## 2. Go disebut prosedural, bukan functional

Go punya fungsi first-class dan closure (dipakai di options.go dan middleware.go), tapi tidak punya immutability bawaan, tidak ada map/filter/reduce di slice, dan loop `for` adalah cara utama. Label yang akurat: bahasa prosedural/imperatif dengan method, interface, dan komposisi. README menjelaskan ini supaya jawaban interview-nya tepat.

## 3. Tetap satu module, app Gin tidak diubah

App Gin di `gin/` sudah memakai pola yang sama (interface `NoteRepository` di sisi service, `Authenticator` kecil, error domain + `errors.Is`, wiring manual di `main.go`). Jadi cukup referensinya di README yang diperbarui. Tidak ada perubahan perilaku.

## 4. Test cuma pakai `testing` bawaan

Tanpa testify/gomock, supaya kelihatan bahwa fake berbasis interface kecil (lihat `fakeLookup` di interfaces_test.go) sudah cukup. Di tim nyata, testify dan mockgen tetap umum.

## 5. CI menjalankan `go vet` dan `go test -race`

Workflow `.github/workflows/go.yml` jalan hanya kalau ada perubahan di `go/`. Pakai versi Go dari `go.mod`, cek `gofmt`, `go vet`, lalu `go test -race`. `-race` wajib karena banyak contoh di sini (Counter, store memory, pipeline channel) soal concurrency.
