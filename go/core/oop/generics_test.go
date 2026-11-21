package oop

import (
	"fmt"
	"slices"
	"strings"
	"testing"
)

func TestStack(t *testing.T) {
	var s Stack[string]
	if _, ok := s.Pop(); ok {
		t.Fatal("Pop dari stack kosong harus ok=false")
	}
	s.Push("a")
	s.Push("b")
	if v, _ := s.Pop(); v != "b" {
		t.Errorf("Pop = %q, want b (LIFO)", v)
	}
	if s.Len() != 1 {
		t.Errorf("Len = %d", s.Len())
	}
}

func TestMapFilter(t *testing.T) {
	names := []string{"go", "java", "js"}
	upper := Map(names, strings.ToUpper)
	if !slices.Equal(upper, []string{"GO", "JAVA", "JS"}) {
		t.Errorf("Map = %v", upper)
	}
	short := Filter(names, func(s string) bool { return len(s) == 2 })
	if !slices.Equal(short, []string{"go", "js"}) {
		t.Errorf("Filter = %v", short)
	}
}

type Rupiah int64

func TestNumberConstraintWithTilde(t *testing.T) {
	// Rupiah boleh dipakai karena constraint pakai ~int64.
	if got := Sum[Rupiah](1000, 2500); got != 3500 {
		t.Errorf("Sum = %d", got)
	}
	if got := MaxOf(3, 9, 4); got != 9 {
		t.Errorf("MaxOf = %d", got)
	}
}

// Example function: dokumentasi yang sekaligus test. `go test` membandingkan
// stdout dengan komentar "Output:". Muncul juga di pkg.go.dev.
func ExampleStack() {
	var s Stack[int]
	for i := range 3 { // range over int, sejak Go 1.22
		s.Push(i)
	}
	for s.Len() > 0 {
		v, _ := s.Pop()
		fmt.Print(v, " ")
	}
	// Output: 2 1 0
}

func ExampleIntroduce() {
	d := Dog{Animal: Animal{Name: "Bleki"}}
	fmt.Println(d.Introduce())
	fmt.Println(Introduce(d.Name, d))
	// Output:
	// Aku Bleki, suaraku ...
	// Aku Bleki, suaraku guk
}
