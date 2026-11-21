package store

import (
	"cmp"
	"context"
	"fmt"
	"maps"
	"slices"
	"sync"

	"github.com/kucingops/catsheet/go/gin/internal/domain"
)

// MemoryNoteRepository menyimpan data di map. Gin melayani tiap request di
// goroutine berbeda, jadi map WAJIB dilindungi mutex (map Go tidak
// thread-safe, mirip HashMap vs ConcurrentHashMap).
//
// RWMutex: banyak reader boleh bareng, writer eksklusif.
type MemoryNoteRepository struct {
	mu     sync.RWMutex
	notes  map[int64]domain.Note
	nextID int64
}

// Compile-time check bahwa tipe ini memenuhi interface.
var _ NoteRepository = (*MemoryNoteRepository)(nil)

func NewMemoryNoteRepository() *MemoryNoteRepository {
	return &MemoryNoteRepository{notes: make(map[int64]domain.Note), nextID: 1}
}

func (r *MemoryNoteRepository) Create(_ context.Context, n domain.Note) (domain.Note, error) {
	r.mu.Lock()
	defer r.mu.Unlock() // defer = jalan saat fungsi selesai, mirip finally
	n.ID = r.nextID
	r.nextID++
	r.notes[n.ID] = n
	return n, nil
}

func (r *MemoryNoteRepository) FindByID(_ context.Context, id int64) (domain.Note, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	n, ok := r.notes[id]
	if !ok {
		return domain.Note{}, fmt.Errorf("note %d: %w", id, domain.ErrNotFound)
	}
	return n, nil
}

func (r *MemoryNoteRepository) FindByOwner(_ context.Context, owner string) ([]domain.Note, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	var out []domain.Note
	for _, n := range r.notes {
		if n.Owner == owner {
			out = append(out, n)
		}
	}
	sortByID(out) // urutan iterasi map Go itu ACAK, sengaja.
	return out, nil
}

func (r *MemoryNoteRepository) FindAll(_ context.Context) ([]domain.Note, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := slices.Collect(maps.Values(r.notes)) // iterator, sejak Go 1.23
	sortByID(out)
	return out, nil
}

func (r *MemoryNoteRepository) Update(_ context.Context, n domain.Note) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.notes[n.ID]; !ok {
		return fmt.Errorf("note %d: %w", n.ID, domain.ErrNotFound)
	}
	r.notes[n.ID] = n
	return nil
}

func (r *MemoryNoteRepository) Delete(_ context.Context, id int64) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.notes[id]; !ok {
		return fmt.Errorf("note %d: %w", id, domain.ErrNotFound)
	}
	delete(r.notes, id)
	return nil
}

func sortByID(ns []domain.Note) {
	slices.SortFunc(ns, func(a, b domain.Note) int { return cmp.Compare(a.ID, b.ID) })
}

// MemoryUserRepository: user disimpan di memori.
type MemoryUserRepository struct {
	mu    sync.RWMutex
	users map[string]domain.User
}

var _ UserRepository = (*MemoryUserRepository)(nil)

func NewMemoryUserRepository() *MemoryUserRepository {
	return &MemoryUserRepository{users: make(map[string]domain.User)}
}

func (r *MemoryUserRepository) FindByUsername(_ context.Context, username string) (domain.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	u, ok := r.users[username]
	if !ok {
		return domain.User{}, fmt.Errorf("user %q: %w", username, domain.ErrNotFound)
	}
	return u, nil
}

func (r *MemoryUserRepository) Save(_ context.Context, u domain.User) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.users[u.Username] = u
	return nil
}
