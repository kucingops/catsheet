package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/kucingops/catsheet/go/gin/internal/domain"
	"github.com/kucingops/catsheet/go/gin/internal/store"
)

var (
	fixedNow = time.Date(2026, 11, 21, 8, 0, 0, 0, time.UTC)
	budi     = domain.Actor{Username: "budi", Roles: []domain.Role{domain.RoleUser}}
	siti     = domain.Actor{Username: "siti", Roles: []domain.Role{domain.RoleUser}}
	admin    = domain.Actor{Username: "admin", Roles: []domain.Role{domain.RoleUser, domain.RoleAdmin}}
)

// Untuk test service, cara paling simpel: pakai implementasi in-memory yang
// asli sebagai "fake". Nggak perlu Mockito.
func newService() *NoteService {
	return NewNoteService(store.NewMemoryNoteRepository(), func() time.Time { return fixedNow })
}

func TestCreate_SetsOwnerAndTimestamps(t *testing.T) {
	svc := newService()
	n, err := svc.Create(t.Context(), budi, NoteInput{Title: "  belanja  ", Body: "telur"})
	if err != nil {
		t.Fatal(err)
	}
	if n.Owner != "budi" || n.Title != "belanja" || !n.CreatedAt.Equal(fixedNow) {
		t.Errorf("note = %+v", n)
	}
}

func TestCreate_Validation(t *testing.T) {
	_, err := newService().Create(t.Context(), budi, NoteInput{Title: ""})
	if !errors.Is(err, domain.ErrValidation) {
		t.Errorf("err = %v, want ErrValidation", err)
	}
}

func TestOwnershipRules(t *testing.T) {
	svc := newService()
	n, _ := svc.Create(t.Context(), budi, NoteInput{Title: "rahasia"})

	tests := []struct {
		name  string
		actor domain.Actor
		want  error // nil = boleh
	}{
		{"owner boleh", budi, nil},
		{"orang lain ditolak", siti, domain.ErrForbidden},
		{"admin boleh", admin, nil},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := svc.Get(t.Context(), tt.actor, n.ID)
			if !errors.Is(err, tt.want) {
				t.Errorf("Get err = %v, want %v", err, tt.want)
			}
			_, err = svc.Update(t.Context(), tt.actor, n.ID, NoteInput{Title: "ubah"})
			if !errors.Is(err, tt.want) {
				t.Errorf("Update err = %v, want %v", err, tt.want)
			}
		})
	}
}

func TestList_AdminSeesAll(t *testing.T) {
	svc := newService()
	svc.Create(t.Context(), budi, NoteInput{Title: "a"})
	svc.Create(t.Context(), siti, NoteInput{Title: "b"})

	mine, _ := svc.List(t.Context(), budi)
	all, _ := svc.List(t.Context(), admin)
	if len(mine) != 1 || len(all) != 2 {
		t.Errorf("budi lihat %d, admin lihat %d", len(mine), len(all))
	}
}

func TestStats_AdminOnly(t *testing.T) {
	svc := newService()
	svc.Create(t.Context(), budi, NoteInput{Title: "a"})
	svc.Create(t.Context(), budi, NoteInput{Title: "b"})

	if _, err := svc.Stats(t.Context(), budi); !errors.Is(err, domain.ErrForbidden) {
		t.Errorf("user biasa: err = %v", err)
	}
	st, err := svc.Stats(t.Context(), admin)
	if err != nil || st.TotalNotes != 2 || st.NotesByOwner["budi"] != 2 {
		t.Errorf("stats = %+v, err = %v", st, err)
	}
}

// ---- Mock manual: untuk mensimulasikan kegagalan infrastruktur ----

// failingRepo meng-embed interface NoteRepository. Semua method yang tidak
// di-override akan panic (karena field interface-nya nil), jadi kita cuma
// perlu menulis method yang memang dipakai test. Trik ini pengganti
// Mockito.mock() + when(...).thenThrow(...).
type failingRepo struct {
	store.NoteRepository
	err   error
	calls int
}

func (f *failingRepo) Create(context.Context, domain.Note) (domain.Note, error) {
	f.calls++
	return domain.Note{}, f.err
}

func TestCreate_PropagatesRepoError(t *testing.T) {
	dbDown := errors.New("koneksi db putus")
	repo := &failingRepo{err: dbDown}
	svc := NewNoteService(repo, nil)

	_, err := svc.Create(t.Context(), budi, NoteInput{Title: "x"})
	if !errors.Is(err, dbDown) {
		t.Errorf("err = %v, want %v", err, dbDown)
	}
	if repo.calls != 1 {
		t.Errorf("repo.Create dipanggil %d kali, want 1", repo.calls)
	}

	// Validasi gagal -> repo tidak boleh disentuh sama sekali.
	svc.Create(t.Context(), budi, NoteInput{Title: ""})
	if repo.calls != 1 {
		t.Errorf("repo dipanggil padahal input tidak valid")
	}
}
