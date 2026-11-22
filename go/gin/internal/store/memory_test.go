package store_test // package _test = black-box test, cuma bisa akses API publik

import (
	"fmt"
	"sync"
	"testing"

	"github.com/kucingops/catsheet/go/gin/internal/domain"
	"github.com/kucingops/catsheet/go/gin/internal/store"
	"github.com/kucingops/catsheet/go/gin/internal/store/storetest"
)

func TestMemoryNoteRepository_Contract(t *testing.T) {
	storetest.RunNoteRepositoryContract(t, func(t *testing.T) store.NoteRepository {
		return store.NewMemoryNoteRepository()
	})
}

// Jalankan dengan `go test -race` untuk memastikan tidak ada data race.
// Coba hapus mutex di memory.go, lalu test ini akan gagal di mode -race.
func TestMemoryNoteRepository_ConcurrentCreate(t *testing.T) {
	repo := store.NewMemoryNoteRepository()
	var wg sync.WaitGroup
	for i := range 100 {
		wg.Go(func() { // WaitGroup.Go sejak Go 1.25: Add(1) + go + Done() sekaligus
			repo.Create(t.Context(), domain.Note{Owner: "budi", Title: fmt.Sprint(i)})
		})
	}
	wg.Wait()
	all, _ := repo.FindAll(t.Context())
	if len(all) != 100 {
		t.Fatalf("len = %d, want 100", len(all))
	}
	seen := map[int64]bool{}
	for _, n := range all {
		if seen[n.ID] {
			t.Fatalf("ID duplikat: %d", n.ID)
		}
		seen[n.ID] = true
	}
}

// Benchmark: go test -bench=. -benchmem ./internal/store
func BenchmarkMemoryNoteRepository_FindByOwner(b *testing.B) {
	repo := store.NewMemoryNoteRepository()
	for i := range 1000 {
		repo.Create(b.Context(), domain.Note{Owner: fmt.Sprint("user", i%10), Title: "x"})
	}
	for b.Loop() { // b.Loop sejak Go 1.24, pengganti for i := 0; i < b.N; i++
		repo.FindByOwner(b.Context(), "user3")
	}
}
