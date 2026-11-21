// Package service berisi logika bisnis. Dependensinya disuntik lewat
// constructor (constructor injection), persis seperti yang dianjurkan Spring,
// bedanya tanpa container: kita rakit sendiri di main.go.
package service

import (
	"context"
	"fmt"
	"time"

	"github.com/kucingops/catsheet/go/gin/internal/domain"
	"github.com/kucingops/catsheet/go/gin/internal/store"
)

type NoteService struct {
	repo store.NoteRepository // bergantung ke interface, bukan implementasi (DIP)
	now  func() time.Time     // jam juga disuntik, supaya test bisa pakai waktu tetap
}

func NewNoteService(repo store.NoteRepository, now func() time.Time) *NoteService {
	if now == nil {
		now = time.Now
	}
	return &NoteService{repo: repo, now: now}
}

type NoteInput struct {
	Title string `json:"title"`
	Body  string `json:"body"`
}

func (s *NoteService) Create(ctx context.Context, actor domain.Actor, in NoteInput) (domain.Note, error) {
	now := s.now().UTC()
	n := domain.Note{Owner: actor.Username, Title: in.Title, Body: in.Body, CreatedAt: now, UpdatedAt: now}
	if err := n.Validate(); err != nil {
		return domain.Note{}, err
	}
	return s.repo.Create(ctx, n)
}

// List: admin lihat semua, user lihat miliknya.
func (s *NoteService) List(ctx context.Context, actor domain.Actor) ([]domain.Note, error) {
	if actor.IsAdmin() {
		return s.repo.FindAll(ctx)
	}
	return s.repo.FindByOwner(ctx, actor.Username)
}

func (s *NoteService) Get(ctx context.Context, actor domain.Actor, id int64) (domain.Note, error) {
	n, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return domain.Note{}, err
	}
	if !actor.CanAccess(n) {
		// Pilihan desain: balikin NotFound (bukan Forbidden) supaya orang lain
		// tidak bisa menebak ID mana yang ada. Di sini pakai Forbidden biar jelas.
		return domain.Note{}, fmt.Errorf("note %d milik %s: %w", id, n.Owner, domain.ErrForbidden)
	}
	return n, nil
}

func (s *NoteService) Update(ctx context.Context, actor domain.Actor, id int64, in NoteInput) (domain.Note, error) {
	n, err := s.Get(ctx, actor, id)
	if err != nil {
		return domain.Note{}, err
	}
	n.Title, n.Body, n.UpdatedAt = in.Title, in.Body, s.now().UTC()
	if err := n.Validate(); err != nil {
		return domain.Note{}, err
	}
	return n, s.repo.Update(ctx, n)
}

func (s *NoteService) Delete(ctx context.Context, actor domain.Actor, id int64) error {
	if _, err := s.Get(ctx, actor, id); err != nil {
		return err
	}
	return s.repo.Delete(ctx, id)
}

type Stats struct {
	TotalNotes   int            `json:"totalNotes"`
	NotesByOwner map[string]int `json:"notesByOwner"`
}

// Stats khusus admin. Cek role di sini juga (defense in depth), bukan cuma
// di middleware. Mirip @PreAuthorize di method service.
func (s *NoteService) Stats(ctx context.Context, actor domain.Actor) (Stats, error) {
	if !actor.IsAdmin() {
		return Stats{}, domain.ErrForbidden
	}
	all, err := s.repo.FindAll(ctx)
	if err != nil {
		return Stats{}, err
	}
	st := Stats{TotalNotes: len(all), NotesByOwner: map[string]int{}}
	for _, n := range all {
		st.NotesByOwner[n.Owner]++
	}
	return st, nil
}
