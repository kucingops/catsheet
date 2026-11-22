package idiomatic

import (
	"context"
	"log/slog"
	"net/http"
	"time"
)

// Fungsi di Go adalah nilai: bisa disimpan, dioper, dikembalikan, dan
// menangkap variabel (closure). Middleware memanfaatkan itu: fungsi yang
// menerima handler dan mengembalikan handler baru.
//
// Padanannya di Spring: Filter / HandlerInterceptor / AOP @Around. Di Go
// tidak perlu proxy atau anotasi, cukup bungkus fungsi.

type Middleware func(http.Handler) http.Handler

// Chain menerapkan middleware dari kiri ke kanan: Chain(h, A, B) = A(B(h)),
// jadi request lewat A dulu, lalu B, lalu h.
func Chain(h http.Handler, mws ...Middleware) http.Handler {
	for i := len(mws) - 1; i >= 0; i-- {
		h = mws[i](h)
	}
	return h
}

// Logging adalah closure: menangkap logger dari luar.
func Logging(logger *slog.Logger) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			next.ServeHTTP(w, r)
			logger.Info("request", "method", r.Method, "path", r.URL.Path, "took", time.Since(start))
		})
	}
}

type ctxKey struct{}

// RequireAPIKey menolak request tanpa key yang benar, dan menaruh nama
// client di context untuk handler berikutnya (mirip SecurityContextHolder,
// tapi eksplisit lewat r.Context()).
func RequireAPIKey(keys map[string]string) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			client, ok := keys[r.Header.Get("X-API-Key")]
			if !ok {
				http.Error(w, "unauthorized", http.StatusUnauthorized)
				return
			}
			ctx := context.WithValue(r.Context(), ctxKey{}, client)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func ClientFrom(ctx context.Context) (string, bool) {
	c, ok := ctx.Value(ctxKey{}).(string)
	return c, ok
}

// Retry adalah higher-order function non-HTTP: menerima fungsi, memanggilnya
// ulang sampai berhasil atau jatah habis.
func Retry(attempts int, fn func() error) error {
	var err error
	for range attempts {
		if err = fn(); err == nil {
			return nil
		}
	}
	return err
}
