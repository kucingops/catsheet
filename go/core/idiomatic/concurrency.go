package idiomatic

import (
	"context"
	"errors"
	"sync"
)

// "Don't communicate by sharing memory; share memory by communicating."
//
// Goroutine itu murah (beberapa KB stack), jadi Go tidak butuh thread pool
// seperti ExecutorService. Channel dipakai untuk mengoper data antar
// goroutine; mutex tetap boleh dipakai untuk state kecil (lihat Counter).
// context.Context membawa sinyal cancel dan deadline, mirip
// Future.cancel + timeout, tapi dioper eksplisit sebagai parameter pertama.

// Generate mengirim angka ke channel sampai habis atau ctx dibatalkan.
// Pengirim yang menutup channel, bukan penerima.
func Generate(ctx context.Context, nums ...int) <-chan int {
	out := make(chan int)
	go func() {
		defer close(out)
		for _, n := range nums {
			select {
			case out <- n:
			case <-ctx.Done():
				return
			}
		}
	}()
	return out
}

// Result membawa nilai atau error dari worker. Error tetap nilai biasa,
// juga saat lewat channel.
type Result struct {
	In, Out int
	Err     error
}

// ParallelMap menjalankan fn dengan `workers` goroutine (fan-out), lalu
// mengumpulkan hasil ke satu channel (fan-in). Urutan hasil tidak dijamin.
func ParallelMap(ctx context.Context, in <-chan int, workers int, fn func(context.Context, int) (int, error)) <-chan Result {
	out := make(chan Result)
	var wg sync.WaitGroup
	for range workers {
		wg.Go(func() { // sync.WaitGroup.Go sejak Go 1.25
			for n := range in {
				v, err := fn(ctx, n)
				select {
				case out <- Result{In: n, Out: v, Err: err}:
				case <-ctx.Done():
					return
				}
			}
		})
	}
	go func() {
		wg.Wait()
		close(out)
	}()
	return out
}

var ErrNegative = errors.New("angka negatif")

// SumOfSquares merangkai pipeline: Generate -> ParallelMap -> kumpulkan.
// Begitu ada error pertama, cancel() menghentikan semua goroutine supaya
// tidak bocor.
func SumOfSquares(ctx context.Context, nums []int, workers int) (int, error) {
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	square := func(_ context.Context, n int) (int, error) {
		if n < 0 {
			return 0, ErrNegative
		}
		return n * n, nil
	}

	total := 0
	for r := range ParallelMap(ctx, Generate(ctx, nums...), workers, square) {
		if r.Err != nil {
			return 0, r.Err // defer cancel() membereskan sisanya
		}
		total += r.Out
	}
	return total, ctx.Err()
}
