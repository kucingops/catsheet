package store_test

import (
	"errors"
	"path/filepath"
	"testing"

	"github.com/kucingops/catsheet/go/gin/internal/domain"
	"github.com/kucingops/catsheet/go/gin/internal/store"
	"github.com/kucingops/catsheet/go/gin/internal/store/storetest"
)

// newSQLRepo bikin DB SQLite baru di folder temp. Karena SQLite pure Go,
// test ini tidak butuh Docker. Untuk Postgres beneran, pola umumnya pakai
// testcontainers-go (padanan Testcontainers di Java).
func newSQLRepo(t *testing.T) *store.SQLNoteRepository {
	t.Helper() // kalau gagal, baris error menunjuk ke pemanggil, bukan ke sini
	db, err := store.OpenSQLite(t.Context(), "file:"+filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() }) // mirip @AfterEach
	return store.NewSQLNoteRepository(db)
}

func TestSQLNoteRepository_Contract(t *testing.T) {
	storetest.RunNoteRepositoryContract(t, func(t *testing.T) store.NoteRepository {
		return newSQLRepo(t)
	})
}

func TestSQLNoteRepository_TransferOwnership(t *testing.T) {
	repo := newSQLRepo(t)
	repo.Create(t.Context(), domain.Note{Owner: "budi", Title: "1"})
	repo.Create(t.Context(), domain.Note{Owner: "budi", Title: "2"})
	repo.Create(t.Context(), domain.Note{Owner: "siti", Title: "3"})

	moved, err := repo.TransferOwnership(t.Context(), "budi", "siti")
	if err != nil {
		t.Fatal(err)
	}
	if moved != 2 {
		t.Errorf("moved = %d, want 2", moved)
	}
	siti, _ := repo.FindByOwner(t.Context(), "siti")
	if len(siti) != 3 {
		t.Errorf("siti punya %d note, want 3", len(siti))
	}

	// Owner yang tidak punya note -> error, dan transaksi di-rollback.
	if _, err := repo.TransferOwnership(t.Context(), "nobody", "siti"); !errors.Is(err, domain.ErrNotFound) {
		t.Errorf("err = %v, want ErrNotFound", err)
	}
}
