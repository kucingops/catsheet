// Package idiomatic berisi contoh Go yang ditulis dengan gaya Go sendiri,
// bukan Java yang diterjemahkan ke Go.
//
// Go itu bahasa prosedural (imperatif) dengan struct, method, interface, dan
// komposisi. Bukan bahasa OOP berbasis class, dan bukan juga bahasa
// functional murni: fungsi memang first-class (bisa dioper, dikembalikan,
// jadi closure), tapi data umumnya mutable dan loop for biasa itu normal.
//
// Satu file = satu kebiasaan Go:
//   - structs.go     struct biasa, zero value yang berguna, embedding
//   - errors.go      error sebagai nilai: sentinel, %w, errors.Is/As/Join
//   - interfaces.go  interface kecil yang didefinisikan pemakainya
//   - options.go     functional options untuk konfigurasi opsional
//   - middleware.go  fungsi yang membungkus fungsi (decorator tanpa class)
//   - iter.go        iterator iter.Seq dan range-over-func
//   - concurrency.go goroutine, channel, context, worker pool
package idiomatic
