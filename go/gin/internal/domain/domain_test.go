package domain

import (
	"errors"
	"strings"
	"testing"
)

func TestNoteValidate(t *testing.T) {
	tests := []struct {
		name    string
		note    Note
		wantErr bool
	}{
		{"valid", Note{Owner: "a", Title: "halo"}, false},
		{"title spasi doang", Note{Owner: "a", Title: "   "}, true},
		{"title kepanjangan", Note{Owner: "a", Title: strings.Repeat("x", 101)}, true},
		{"title 100 rune unicode", Note{Owner: "a", Title: strings.Repeat("é", 100)}, false},
		{"owner kosong", Note{Title: "halo"}, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.note.Validate()
			if (err != nil) != tt.wantErr {
				t.Fatalf("Validate() = %v, wantErr %v", err, tt.wantErr)
			}
			if err != nil && !errors.Is(err, ErrValidation) {
				t.Errorf("error harus membungkus ErrValidation, got %v", err)
			}
		})
	}
}

// Fuzz test (sejak Go 1.18): Go generate input acak dan cari input yang bikin
// invariant rusak. Jalankan: go test -fuzz=FuzzNoteValidate ./internal/domain
// Tanpa -fuzz, seed corpus di bawah tetap jalan sebagai unit test biasa.
func FuzzNoteValidate(f *testing.F) {
	f.Add("halo")
	f.Add("  ")
	f.Add(strings.Repeat("ü", 101))
	f.Fuzz(func(t *testing.T, title string) {
		n := Note{Owner: "a", Title: title}
		if err := n.Validate(); err == nil {
			if n.Title == "" || len([]rune(n.Title)) > MaxTitleLen {
				t.Errorf("Validate lolos untuk title tidak valid: %q", n.Title)
			}
		}
	})
}

func TestActorCanAccess(t *testing.T) {
	note := Note{Owner: "budi"}
	cases := []struct {
		actor Actor
		want  bool
	}{
		{Actor{Username: "budi", Roles: []Role{RoleUser}}, true},
		{Actor{Username: "siti", Roles: []Role{RoleUser}}, false},
		{Actor{Username: "admin", Roles: []Role{RoleUser, RoleAdmin}}, true},
	}
	for _, c := range cases {
		if got := c.actor.CanAccess(note); got != c.want {
			t.Errorf("%s.CanAccess = %v, want %v", c.actor.Username, got, c.want)
		}
	}
}
