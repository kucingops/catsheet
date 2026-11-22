package idiomatic

import (
	"iter"
	"maps"
	"slices"
	"strings"
)

// Sejak Go 1.23, fungsi dengan bentuk func(yield func(T) bool) bisa dipakai
// di `for range`. Tipenya iter.Seq[T] (dan iter.Seq2[K, V]).
//
// Ini padanan terdekat Java Stream / Iterator: lazy, bisa dirangkai, dan
// berhenti lebih awal kalau loop-nya break. Tapi tetap ditulis dengan for
// biasa, bukan rantai .map().filter().collect().

// Filter mengembalikan iterator yang hanya meneruskan elemen yang lolos.
// Generic function biasa, bukan method, karena Go belum punya method
// dengan type parameter sendiri.
func Filter[T any](seq iter.Seq[T], keep func(T) bool) iter.Seq[T] {
	return func(yield func(T) bool) {
		for v := range seq {
			if keep(v) && !yield(v) {
				return
			}
		}
	}
}

func Map[T, R any](seq iter.Seq[T], f func(T) R) iter.Seq[R] {
	return func(yield func(R) bool) {
		for v := range seq {
			if !yield(f(v)) {
				return
			}
		}
	}
}

// Take berhenti setelah n elemen. Karena lazy, sumber tak terbatas pun aman.
func Take[T any](seq iter.Seq[T], n int) iter.Seq[T] {
	return func(yield func(T) bool) {
		if n <= 0 {
			return
		}
		i := 0
		for v := range seq {
			if !yield(v) {
				return
			}
			i++
			if i == n {
				return
			}
		}
	}
}

// Naturals adalah iterator tak terbatas: 1, 2, 3, ...
func Naturals() iter.Seq[int] {
	return func(yield func(int) bool) {
		for i := 1; ; i++ {
			if !yield(i) {
				return
			}
		}
	}
}

// FirstSquaresOfEvens: dari bilangan asli, ambil yang genap, kuadratkan,
// ambil n pertama. Java: Stream.iterate(1, i -> i + 1).filter(..).map(..).limit(n).toList().
func FirstSquaresOfEvens(n int) []int {
	evens := Filter(Naturals(), func(i int) bool { return i%2 == 0 })
	squares := Map(evens, func(i int) int { return i * i })
	return slices.Collect(Take(squares, n))
}

// SortedKeys: urutan iterasi map di Go sengaja acak, jadi kalau perlu urut,
// kumpulkan key lalu sort. maps.Keys dan slices.Sorted menerima iter.Seq.
func SortedKeys[V any](m map[string]V) []string {
	return slices.Sorted(maps.Keys(m))
}

// WordsUpper memakai iterator dari stdlib (strings.FieldsSeq, Go 1.24).
// Kadang loop biasa adalah jawaban paling jelas, dan itu idiomatis.
func WordsUpper(s string) []string {
	var out []string
	for w := range strings.FieldsSeq(s) {
		out = append(out, strings.ToUpper(w))
	}
	return out
}
