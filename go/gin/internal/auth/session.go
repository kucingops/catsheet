package auth

import (
	"crypto/rand"
	"net/http"
	"sync"
	"time"
)

// Session login = form login klasik. Alurnya:
//  1. POST /auth/session/login dengan username+password.
//  2. Server bikin session ID acak, simpan datanya di SERVER (SessionStore),
//     kirim ID-nya ke browser lewat cookie HttpOnly.
//  3. Request berikutnya, browser otomatis kirim cookie; server cari datanya.
//
// Beda utama dengan JWT: state ada di server. Logout = hapus dari store, dan
// langsung berlaku. Kekurangannya: kalau server lebih dari satu, store harus
// dibagi (Redis), mirip Spring Session.

const SessionCookie = "SESSION"

type session struct {
	principal Principal
	expiresAt time.Time
}

type SessionStore struct {
	mu       sync.Mutex
	sessions map[string]session
	ttl      time.Duration
}

func NewSessionStore(ttl time.Duration) *SessionStore {
	return &SessionStore{sessions: map[string]session{}, ttl: ttl}
}

func (s *SessionStore) TTL() time.Duration { return s.ttl }

// Create bikin session baru. rand.Text (Go 1.24) menghasilkan string acak
// kriptografis 26 karakter base32 (~130 bit), aman dipakai sebagai session ID.
func (s *SessionStore) Create(p Principal) string {
	id := rand.Text()
	p.Method = "session"
	s.mu.Lock()
	defer s.mu.Unlock()
	s.sessions[id] = session{principal: p, expiresAt: time.Now().Add(s.ttl)}
	return id
}

// Get juga menerapkan sliding expiration: tiap dipakai, umurnya diperpanjang.
func (s *SessionStore) Get(id string) (Principal, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	sess, ok := s.sessions[id]
	if !ok {
		return Principal{}, false
	}
	if time.Now().After(sess.expiresAt) {
		delete(s.sessions, id) // hapus lazy; di produksi tambahkan janitor goroutine
		return Principal{}, false
	}
	sess.expiresAt = time.Now().Add(s.ttl)
	s.sessions[id] = sess
	return sess.principal, true
}

func (s *SessionStore) Delete(id string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.sessions, id)
}

type SessionAuth struct {
	Store *SessionStore
}

func (SessionAuth) Name() string { return "session" }

func (a SessionAuth) Authenticate(r *http.Request) (Principal, error) {
	c, err := r.Cookie(SessionCookie)
	if err != nil {
		return Principal{}, ErrNoCredentials
	}
	p, ok := a.Store.Get(c.Value)
	if !ok {
		return Principal{}, ErrBadCredentials
	}
	return p, nil
}

// NewSessionCookie: HttpOnly (JS tidak bisa baca, mitigasi XSS),
// SameSite=Strict (cookie tidak ikut di request lintas situs, mitigasi CSRF),
// Secure (cuma lewat HTTPS; dimatikan saat dev lokal tanpa TLS).
func NewSessionCookie(id string, maxAge time.Duration, secure bool) *http.Cookie {
	return &http.Cookie{
		Name:     SessionCookie,
		Value:    id,
		Path:     "/",
		MaxAge:   int(maxAge.Seconds()),
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteStrictMode,
	}
}
