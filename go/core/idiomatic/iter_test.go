package idiomatic

import (
	"fmt"
	"slices"
	"testing"
)

func TestFirstSquaresOfEvens(t *testing.T) {
	got := FirstSquaresOfEvens(4)
	if want := []int{4, 16, 36, 64}; !slices.Equal(got, want) {
		t.Fatalf("got %v, mau %v", got, want)
	}
	if got := FirstSquaresOfEvens(0); len(got) != 0 {
		t.Fatalf("n=0: %v", got)
	}
}

func TestIteratorStopsEarly(t *testing.T) {
	pulled := 0
	src := func(yield func(int) bool) {
		for i := range 1000 {
			pulled++
			if !yield(i) {
				return
			}
		}
	}
	for v := range src {
		if v == 2 {
			break
		}
	}
	if pulled != 3 {
		t.Fatalf("pulled = %d, mau 3 (lazy)", pulled)
	}
}

func TestSortedKeys(t *testing.T) {
	got := SortedKeys(map[string]int{"c": 3, "a": 1, "b": 2})
	if !slices.Equal(got, []string{"a", "b", "c"}) {
		t.Fatalf("got %v", got)
	}
}

func TestWordsUpper(t *testing.T) {
	if got := WordsUpper(" go  itu asik "); !slices.Equal(got, []string{"GO", "ITU", "ASIK"}) {
		t.Fatalf("got %v", got)
	}
}

func ExampleFirstSquaresOfEvens() {
	fmt.Println(FirstSquaresOfEvens(3))
	// Output: [4 16 36]
}
