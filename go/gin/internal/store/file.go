package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"sync"

	"github.com/kucingops/catsheet/go/gin/internal/domain"
)

// FileNoteRepository = MemoryNoteRepository + simpan ke file JSON.
//
// Ini contoh KOMPOSISI lewat embedding: semua method baca (FindByID,
// FindByOwner, FindAll) diwarisi gratis dari *MemoryNoteRepository. Kita cuma
// "override" method tulis supaya setelah berubah, isi memori di-flush ke file.
//
// Di Java mungkin kamu bikin `class FileRepo extends MemoryRepo` lalu
// @Override. Bedanya di Go: tidak ada super(), kita panggil langsung
// r.MemoryNoteRepository.Create(...).
type FileNoteRepository struct {
	*MemoryNoteRepository
	path    string
	flushMu sync.Mutex
}

var _ NoteRepository = (*FileNoteRepository)(nil)

// snapshot itu format di disk. Dipisah dari struct domain supaya format file
// bisa berevolusi tanpa mengubah domain.
type snapshot struct {
	NextID int64         `json:"nextId"`
	Notes  []domain.Note `json:"notes"`
}

func NewFileNoteRepository(path string) (*FileNoteRepository, error) {
	r := &FileNoteRepository{MemoryNoteRepository: NewMemoryNoteRepository(), path: path}
	if err := r.load(); err != nil {
		return nil, err
	}
	return r, nil
}

func (r *FileNoteRepository) load() error {
	data, err := os.ReadFile(r.path)
	if errors.Is(err, fs.ErrNotExist) {
		return nil // file belum ada = repo kosong
	}
	if err != nil {
		return fmt.Errorf("baca %s: %w", r.path, err)
	}
	var s snapshot
	if err := json.Unmarshal(data, &s); err != nil {
		return fmt.Errorf("parse %s: %w", r.path, err)
	}
	for _, n := range s.Notes {
		r.notes[n.ID] = n
	}
	r.nextID = max(s.NextID, 1)
	return nil
}

// flush menulis ke file sementara lalu rename. Rename itu atomic di sistem
// file yang sama, jadi file tidak pernah setengah tertulis kalau proses mati.
func (r *FileNoteRepository) flush(ctx context.Context) error {
	r.flushMu.Lock()
	defer r.flushMu.Unlock()

	all, _ := r.FindAll(ctx)
	r.mu.RLock()
	s := snapshot{NextID: r.nextID, Notes: all}
	r.mu.RUnlock()

	data, err := json.MarshalIndent(s, "", "  ")
	if err != nil {
		return err
	}
	tmp, err := os.CreateTemp(filepath.Dir(r.path), ".notes-*.json")
	if err != nil {
		return err
	}
	defer os.Remove(tmp.Name()) // no-op kalau rename sudah sukses
	if _, err := tmp.Write(data); err != nil {
		tmp.Close()
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}
	return os.Rename(tmp.Name(), r.path)
}

func (r *FileNoteRepository) Create(ctx context.Context, n domain.Note) (domain.Note, error) {
	n, err := r.MemoryNoteRepository.Create(ctx, n) // "super.create(n)"
	if err != nil {
		return n, err
	}
	return n, r.flush(ctx)
}

func (r *FileNoteRepository) Update(ctx context.Context, n domain.Note) error {
	if err := r.MemoryNoteRepository.Update(ctx, n); err != nil {
		return err
	}
	return r.flush(ctx)
}

func (r *FileNoteRepository) Delete(ctx context.Context, id int64) error {
	if err := r.MemoryNoteRepository.Delete(ctx, id); err != nil {
		return err
	}
	return r.flush(ctx)
}
