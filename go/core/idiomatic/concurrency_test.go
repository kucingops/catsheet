package idiomatic

import (
	"context"
	"errors"
	"testing"
	"time"
)

func TestSumOfSquares(t *testing.T) {
	got, err := SumOfSquares(t.Context(), []int{1, 2, 3, 4, 5}, 3)
	if err != nil || got != 55 {
		t.Fatalf("got %d, %v", got, err)
	}
}

func TestSumOfSquaresStopsOnError(t *testing.T) {
	nums := make([]int, 1000)
	for i := range nums {
		nums[i] = i
	}
	nums[10] = -1
	if _, err := SumOfSquares(t.Context(), nums, 4); !errors.Is(err, ErrNegative) {
		t.Fatalf("err = %v, mau ErrNegative", err)
	}
}

func TestGenerateRespectsCancel(t *testing.T) {
	ctx, cancel := context.WithCancel(t.Context())
	ch := Generate(ctx, 1, 2, 3, 4, 5)
	<-ch
	cancel()
	// Setelah cancel, channel harus tertutup tanpa menggantung.
	deadline := time.After(time.Second)
	for {
		select {
		case _, ok := <-ch:
			if !ok {
				return
			}
		case <-deadline:
			t.Fatal("channel tidak ditutup setelah cancel (goroutine bocor)")
		}
	}
}
