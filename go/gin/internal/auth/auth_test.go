package auth

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/kucingops/catsheet/go/gin/internal/domain"
	"github.com/kucingops/catsheet/go/gin/internal/store"
)

func newChecker(t *testing.T) *PasswordChecker {
	t.Helper()
	users := store.NewMemoryUserRepository()
	hash, err := HashPassword("rahasia")
	if err != nil {
		t.Fatal(err)
	}
	users.Save(t.Context(), domain.User{Username: "budi", PasswordHash: hash, Roles: []domain.Role{domain.RoleUser}})
	return NewPasswordChecker(users)
}

func TestPasswordChecker(t *testing.T) {
	c := newChecker(t)
	tests := []struct {
		user, pass string
		ok         bool
	}{
		{"budi", "rahasia", true},
		{"budi", "salah", false},
		{"hantu", "rahasia", false}, // user tidak ada -> error yang SAMA dengan password salah
	}
	for _, tt := range tests {
		_, err := c.Check(t.Context(), tt.user, tt.pass)
		if tt.ok != (err == nil) {
			t.Errorf("Check(%s,%s) err = %v", tt.user, tt.pass, err)
		}
		if err != nil && !errors.Is(err, ErrBadCredentials) {
			t.Errorf("err harus ErrBadCredentials, got %v", err)
		}
	}
}

func TestBasicAuth(t *testing.T) {
	a := BasicAuth{Checker: newChecker(t)}

	r := httptest.NewRequest(http.MethodGet, "/", nil)
	if _, err := a.Authenticate(r); !errors.Is(err, ErrNoCredentials) {
		t.Errorf("tanpa header: err = %v, want ErrNoCredentials", err)
	}

	r.SetBasicAuth("budi", "rahasia")
	p, err := a.Authenticate(r)
	if err != nil || p.Username != "budi" || p.Method != "basic" {
		t.Errorf("p = %+v, err = %v", p, err)
	}

	r.SetBasicAuth("budi", "salah")
	if _, err := a.Authenticate(r); !errors.Is(err, ErrBadCredentials) {
		t.Errorf("password salah: err = %v", err)
	}
}

func TestAPIKeyAuth(t *testing.T) {
	a := NewAPIKeyAuth()
	a.Register("key-123", Principal{Username: "reporting-service", Roles: []domain.Role{domain.RoleAdmin}})

	tests := []struct {
		name, key string
		want      error
	}{
		{"tanpa key", "", ErrNoCredentials},
		{"key salah", "ngasal", ErrBadCredentials},
		{"key benar", "key-123", nil},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := httptest.NewRequest(http.MethodGet, "/", nil)
			if tt.key != "" {
				r.Header.Set(APIKeyHeader, tt.key)
			}
			p, err := a.Authenticate(r)
			if !errors.Is(err, tt.want) {
				t.Fatalf("err = %v, want %v", err, tt.want)
			}
			if err == nil && (p.Username != "reporting-service" || p.Method != "apikey") {
				t.Errorf("p = %+v", p)
			}
		})
	}
}
