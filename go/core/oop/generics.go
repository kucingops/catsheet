package oop

import "cmp"

// Stack generik. Beda sama Java: Go generics tidak di-erase, dan bisa
// dipakai dengan tipe primitif (Stack[int]) tanpa boxing.
type Stack[T any] struct {
	items []T
}

func (s *Stack[T]) Push(v T) { s.items = append(s.items, v) }

// Pop mengembalikan (nilai, ok). Pola "comma ok" ini pengganti Optional<T>.
func (s *Stack[T]) Pop() (T, bool) {
	var zero T
	if len(s.items) == 0 {
		return zero, false
	}
	v := s.items[len(s.items)-1]
	s.items = s.items[:len(s.items)-1]
	return v, true
}

func (s *Stack[T]) Len() int { return len(s.items) }

// Map dan Filter: fungsi generik biasa (Go belum punya method generik,
// jadi nggak bisa s.Map(...) dengan type parameter baru).
func Map[T, R any](in []T, f func(T) R) []R {
	out := make([]R, 0, len(in))
	for _, v := range in {
		out = append(out, f(v))
	}
	return out
}

func Filter[T any](in []T, keep func(T) bool) []T {
	var out []T
	for _, v := range in {
		if keep(v) {
			out = append(out, v)
		}
	}
	return out
}

// MaxOf pakai constraint cmp.Ordered, mirip <T extends Comparable<T>>.
func MaxOf[T cmp.Ordered](first T, rest ...T) T {
	m := first
	for _, v := range rest {
		m = max(m, v) // builtin max sejak Go 1.21
	}
	return m
}

// Number itu constraint custom: union type. Tanda ~ berarti "termasuk tipe
// yang underlying type-nya int/float64", misalnya `type Rupiah int64`.
type Number interface {
	~int | ~int64 | ~float64
}

func Sum[T Number](xs ...T) T {
	var total T
	for _, x := range xs {
		total += x
	}
	return total
}
