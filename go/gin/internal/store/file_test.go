package store_test

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/kucingops/catsheet/go/gin/internal/domain"
	"github.com/kucingops/catsheet/go/gin/internal/store"
	"github.com/kucingops/catsheet/go/gin/internal/store/storetest"
)

func TestFileNoteRepository_Contract(t *testing.T) {
	storetest.RunNoteRepositoryContract(t, func(t *testing.T) store.NoteRepository {
		// t.TempDir otomatis dihapus setelah test selesai.
		repo, err := store.NewFileNoteRepository(filepath.Join(t.TempDir(), "notes.json"))
		if err != nil {
			t.Fatal(err)
		}
		return repo
	})
}

// Ini yang membedakan file dari memory: data selamat setelah "restart".
func TestFileNoteRepository_SurvivesRestart(t *testing.T) {
	path := filepath.Join(t.TempDir(), "notes.json")

	first, err := store.NewFileNoteRepository(path)
	if err != nil {
		t.Fatal(err)
	}
	a, _ := first.Create(t.Context(), domain.Note{Owner: "budi", Title: "a"})
	b, _ := first.Create(t.Context(), domain.Note{Owner: "budi", Title: "b"})
	first.Delete(t.Context(), a.ID)

	second, err := store.NewFileNoteRepository(path) // simulasi restart
	if err != nil {
		t.Fatal(err)
	}
	all, _ := second.FindAll(t.Context())
	if len(all) != 1 || all[0].ID != b.ID {
		t.Fatalf("setelah restart = %+v", all)
	}
	c, _ := second.Create(t.Context(), domain.Note{Owner: "budi", Title: "c"})
	if c.ID <= b.ID {
		t.Errorf("ID harus lanjut dari sebelum restart: got %d, prev %d", c.ID, b.ID)
	}
}

func TestFileNoteRepository_CorruptFile(t *testing.T) {
	path := filepath.Join(t.TempDir(), "notes.json")
	os.WriteFile(path, []byte("{bukan json"), 0o600)
	if _, err := store.NewFileNoteRepository(path); err == nil {
		t.Fatal("file rusak harus error, bukan diam-diam kosong")
	}
}
