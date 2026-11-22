// Package store berisi cara-cara menyimpan data. Semua implementasi
// memenuhi interface yang sama, jadi service tidak peduli datanya ada di
// memori, file JSON, atau database.
//
//	MemoryNoteRepository  -> tanpa persistence, hilang saat restart
//	FileNoteRepository    -> persistence sederhana ke file JSON
//	SQLNoteRepository     -> persistence ke database lewat database/sql (SQLite)
//
// Padanan Spring: interface NoteRepository + beberapa @Repository, dipilih
// lewat @Profile atau @ConditionalOnProperty. Di Go pemilihannya eksplisit
// di main.go (lihat cmd/server).
package store

import (
	"context"

	"github.com/kucingops/catsheet/go/gin/internal/domain"
)

// NoteRepository itu "port". Semua method terima context.Context sebagai
// argumen pertama: buat cancel/timeout (misal request HTTP dibatalkan client,
// query DB ikut berhenti). Di Java biasanya ini implisit lewat ThreadLocal.
type NoteRepository interface {
	Create(ctx context.Context, n domain.Note) (domain.Note, error)
	FindByID(ctx context.Context, id int64) (domain.Note, error)
	FindByOwner(ctx context.Context, owner string) ([]domain.Note, error)
	FindAll(ctx context.Context) ([]domain.Note, error)
	Update(ctx context.Context, n domain.Note) error
	Delete(ctx context.Context, id int64) error
}

// UserRepository sengaja cuma read-only + Save; user di-seed saat startup.
type UserRepository interface {
	FindByUsername(ctx context.Context, username string) (domain.User, error)
	Save(ctx context.Context, u domain.User) error
}
