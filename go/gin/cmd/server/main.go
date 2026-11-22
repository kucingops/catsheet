// Command server menjalankan API notes.
//
//	go run ./gin/cmd/server                       # STORE=memory (default)
//	STORE=file   go run ./gin/cmd/server          # simpan ke notes.json
//	STORE=sqlite go run ./gin/cmd/server          # simpan ke notes.db
//
// User bawaan (password sama dengan username + "123"):
//
//	budi  / budi123   -> USER
//	siti  / siti123   -> USER
//	admin / admin123  -> USER, ADMIN
//
// API key bawaan: X-API-Key: demo-reporting-key (role ADMIN).
package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/kucingops/catsheet/go/gin/internal/auth"
	"github.com/kucingops/catsheet/go/gin/internal/domain"
	"github.com/kucingops/catsheet/go/gin/internal/httpapi"
	"github.com/kucingops/catsheet/go/gin/internal/service"
	"github.com/kucingops/catsheet/go/gin/internal/store"
)

func main() {
	// Pola umum: main() cuma memanggil run() dan menangani error-nya.
	// run() mengembalikan error, jadi defer tetap jalan dan gampang di-test.
	if err := run(); err != nil {
		slog.Error("server berhenti", "err", err)
		os.Exit(1)
	}
}

func run() error {
	// ctx dibatalkan saat Ctrl+C / SIGTERM (misal dari Kubernetes).
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	notes, closeStore, err := openNoteRepository(ctx, env("STORE", "memory"))
	if err != nil {
		return err
	}
	defer closeStore()

	users := store.NewMemoryUserRepository()
	if err := seedUsers(ctx, users); err != nil {
		return err
	}

	apiKeys := auth.NewAPIKeyAuth()
	apiKeys.Register(env("API_KEY", "demo-reporting-key"),
		auth.Principal{Username: "reporting-service", Roles: []domain.Role{domain.RoleAdmin}})

	// Semua dependency dirakit manual di sini. Ini yang di Spring dikerjakan
	// oleh ApplicationContext. Kelebihannya: tidak ada magic, error ketahuan
	// saat compile. Kekurangannya: harus ditulis sendiri.
	router := httpapi.NewRouter(httpapi.Deps{
		Notes:        service.NewNoteService(notes, time.Now),
		Passwords:    auth.NewPasswordChecker(users),
		Sessions:     auth.NewSessionStore(30 * time.Minute),
		JWT:          auth.NewJWTIssuer([]byte(env("JWT_SECRET", "ganti-di-produksi")), "catsheet", 15*time.Minute),
		APIKeys:      apiKeys,
		SecureCookie: env("SECURE_COOKIE", "false") == "true",
	})
	srv := &http.Server{
		Addr:              ":" + env("PORT", "8080"),
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second, // tanpa timeout, rentan slowloris
	}

	errCh := make(chan error, 1)
	go func() {
		slog.Info("listening", "addr", srv.Addr, "store", env("STORE", "memory"))
		errCh <- srv.ListenAndServe()
	}()

	select {
	case err := <-errCh:
		if !errors.Is(err, http.ErrServerClosed) {
			return err
		}
	case <-ctx.Done():
		// Graceful shutdown: berhenti terima koneksi baru, tunggu request
		// yang sedang jalan maksimal 10 detik.
		slog.Info("shutting down")
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		return srv.Shutdown(shutdownCtx)
	}
	return nil
}

// openNoteRepository: di sinilah "pilih implementasi" terjadi. Mengembalikan
// interface, jadi kode di luar fungsi ini tidak tahu implementasinya apa.
func openNoteRepository(ctx context.Context, kind string) (store.NoteRepository, func(), error) {
	noop := func() {}
	switch kind {
	case "memory":
		return store.NewMemoryNoteRepository(), noop, nil
	case "file":
		r, err := store.NewFileNoteRepository(env("FILE_PATH", "notes.json"))
		return r, noop, err
	case "sqlite":
		db, err := store.OpenSQLite(ctx, "file:"+env("SQLITE_PATH", "notes.db"))
		if err != nil {
			return nil, noop, err
		}
		return store.NewSQLNoteRepository(db), func() { db.Close() }, nil
	default:
		return nil, noop, fmt.Errorf("STORE tidak dikenal: %q (pilih memory|file|sqlite)", kind)
	}
}

func seedUsers(ctx context.Context, users store.UserRepository) error {
	seed := []struct {
		name  string
		roles []domain.Role
	}{
		{"budi", []domain.Role{domain.RoleUser}},
		{"siti", []domain.Role{domain.RoleUser}},
		{"admin", []domain.Role{domain.RoleUser, domain.RoleAdmin}},
	}
	for _, s := range seed {
		hash, err := auth.HashPassword(s.name + "123")
		if err != nil {
			return err
		}
		if err := users.Save(ctx, domain.User{Username: s.name, PasswordHash: hash, Roles: s.roles}); err != nil {
			return err
		}
	}
	return nil
}

func env(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok {
		return v
	}
	return fallback
}
