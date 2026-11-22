// Package storetest berisi "contract test": satu set test yang dijalankan
// ke SEMUA implementasi NoteRepository. Kalau suatu implementasi lolos,
// berarti dia bisa menggantikan implementasi lain tanpa mengubah perilaku
// (Liskov Substitution Principle, versi yang bisa dibuktikan).
package storetest

import (
	"errors"
	"testing"
	"time"

	"github.com/kucingops/catsheet/go/gin/internal/domain"
	"github.com/kucingops/catsheet/go/gin/internal/store"
)

// Factory membuat repo baru yang kosong untuk tiap subtest.
type Factory func(t *testing.T) store.NoteRepository

func RunNoteRepositoryContract(t *testing.T, newRepo Factory) {
	now := time.Date(2026, 11, 21, 10, 0, 0, 0, time.UTC)
	note := func(owner, title string) domain.Note {
		return domain.Note{Owner: owner, Title: title, Body: "isi", CreatedAt: now, UpdatedAt: now}
	}

	t.Run("create lalu find by id", func(t *testing.T) {
		repo := newRepo(t)
		created, err := repo.Create(t.Context(), note("budi", "a"))
		if err != nil {
			t.Fatal(err)
		}
		if created.ID == 0 {
			t.Fatal("ID harus di-generate")
		}
		got, err := repo.FindByID(t.Context(), created.ID)
		if err != nil {
			t.Fatal(err)
		}
		if got != created {
			t.Errorf("FindByID = %+v, want %+v", got, created)
		}
	})

	t.Run("id unik dan naik", func(t *testing.T) {
		repo := newRepo(t)
		a, _ := repo.Create(t.Context(), note("budi", "a"))
		b, _ := repo.Create(t.Context(), note("budi", "b"))
		if b.ID <= a.ID {
			t.Errorf("ID tidak naik: %d lalu %d", a.ID, b.ID)
		}
	})

	t.Run("find by id yang tidak ada -> ErrNotFound", func(t *testing.T) {
		repo := newRepo(t)
		_, err := repo.FindByID(t.Context(), 999)
		if !errors.Is(err, domain.ErrNotFound) {
			t.Errorf("err = %v, want ErrNotFound", err)
		}
	})

	t.Run("find by owner cuma milik owner, urut id", func(t *testing.T) {
		repo := newRepo(t)
		repo.Create(t.Context(), note("budi", "1"))
		repo.Create(t.Context(), note("siti", "2"))
		repo.Create(t.Context(), note("budi", "3"))
		got, err := repo.FindByOwner(t.Context(), "budi")
		if err != nil {
			t.Fatal(err)
		}
		if len(got) != 2 || got[0].Title != "1" || got[1].Title != "3" {
			t.Errorf("FindByOwner = %+v", got)
		}
		all, _ := repo.FindAll(t.Context())
		if len(all) != 3 {
			t.Errorf("FindAll len = %d, want 3", len(all))
		}
	})

	t.Run("update", func(t *testing.T) {
		repo := newRepo(t)
		n, _ := repo.Create(t.Context(), note("budi", "lama"))
		n.Title = "baru"
		n.UpdatedAt = now.Add(time.Hour)
		if err := repo.Update(t.Context(), n); err != nil {
			t.Fatal(err)
		}
		got, _ := repo.FindByID(t.Context(), n.ID)
		if got.Title != "baru" || !got.UpdatedAt.Equal(n.UpdatedAt) {
			t.Errorf("setelah update = %+v", got)
		}
		if err := repo.Update(t.Context(), domain.Note{ID: 999}); !errors.Is(err, domain.ErrNotFound) {
			t.Errorf("update id tidak ada: err = %v", err)
		}
	})

	t.Run("delete", func(t *testing.T) {
		repo := newRepo(t)
		n, _ := repo.Create(t.Context(), note("budi", "x"))
		if err := repo.Delete(t.Context(), n.ID); err != nil {
			t.Fatal(err)
		}
		if _, err := repo.FindByID(t.Context(), n.ID); !errors.Is(err, domain.ErrNotFound) {
			t.Errorf("setelah delete, err = %v", err)
		}
		if err := repo.Delete(t.Context(), n.ID); !errors.Is(err, domain.ErrNotFound) {
			t.Errorf("delete dua kali, err = %v", err)
		}
	})
}
