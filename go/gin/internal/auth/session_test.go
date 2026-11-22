package auth

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"testing/synctest"
	"time"
)

// testing/synctest (stabil sejak Go 1.25): di dalam "bubble", jam itu palsu.
// time.Sleep(31 * time.Minute) selesai instan, tapi time.Now() di kode
// produksi ikut maju 31 menit. Jadi kita bisa test expiry TANPA menyuntik
// clock dan tanpa benar-benar menunggu.
func TestSessionStore_Expiry(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		s := NewSessionStore(30 * time.Minute)
		id := s.Create(budi)

		time.Sleep(20 * time.Minute)
		if _, ok := s.Get(id); !ok {
			t.Fatal("session harus masih hidup di menit ke-20")
		}

		// Sliding expiration: Get barusan memperpanjang umur 30 menit lagi.
		time.Sleep(25 * time.Minute)
		if _, ok := s.Get(id); !ok {
			t.Fatal("session harus diperpanjang oleh Get sebelumnya")
		}

		time.Sleep(31 * time.Minute)
		if _, ok := s.Get(id); ok {
			t.Fatal("session harus sudah expired")
		}
	})
}

func TestSessionStore_IDsAreUnique(t *testing.T) {
	s := NewSessionStore(time.Minute)
	seen := map[string]bool{}
	for range 1000 {
		id := s.Create(budi)
		if seen[id] {
			t.Fatalf("session ID duplikat: %s", id)
		}
		seen[id] = true
	}
}

func TestSessionAuth(t *testing.T) {
	s := NewSessionStore(time.Minute)
	a := SessionAuth{Store: s}
	id := s.Create(budi)

	r := httptest.NewRequest(http.MethodGet, "/", nil)
	r.AddCookie(NewSessionCookie(id, time.Minute, false))
	p, err := a.Authenticate(r)
	if err != nil || p.Username != "budi" || p.Method != "session" {
		t.Fatalf("p = %+v, err = %v", p, err)
	}

	s.Delete(id) // logout
	if _, err := a.Authenticate(r); err == nil {
		t.Fatal("setelah logout, cookie lama harus ditolak")
	}
}

func TestSessionCookieFlags(t *testing.T) {
	c := NewSessionCookie("x", time.Hour, true)
	if !c.HttpOnly || !c.Secure || c.SameSite != http.SameSiteStrictMode {
		t.Errorf("flag keamanan cookie kurang: %+v", c)
	}
}
