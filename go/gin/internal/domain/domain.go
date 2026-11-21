// Package domain berisi entity dan error bisnis. Package ini sengaja tidak
// import apa pun dari Gin, database, atau auth, supaya bisa dipakai dan
// di-test tanpa infrastruktur (mirip lapisan "domain" di hexagonal/clean arch).
package domain

import (
	"errors"
	"slices"
	"strings"
	"time"
)

// Sentinel error. Layer HTTP yang menerjemahkan ini ke status code,
// mirip @ControllerAdvice + @ExceptionHandler di Spring.
var (
	ErrNotFound   = errors.New("not found")
	ErrForbidden  = errors.New("forbidden")
	ErrValidation = errors.New("validation failed")
	ErrConflict   = errors.New("conflict")
)

type Role string

const (
	RoleUser  Role = "USER"
	RoleAdmin Role = "ADMIN"
)

type User struct {
	Username     string
	PasswordHash []byte
	Roles        []Role
}

func (u User) HasRole(r Role) bool { return slices.Contains(u.Roles, r) }

// Actor itu "siapa yang sedang melakukan aksi". Service cuma butuh ini,
// tidak perlu tahu login-nya lewat Basic, session, JWT, atau API key.
type Actor struct {
	Username string
	Roles    []Role
}

func (a Actor) IsAdmin() bool { return slices.Contains(a.Roles, RoleAdmin) }

// CanAccess: admin boleh akses semua, user biasa cuma miliknya sendiri.
func (a Actor) CanAccess(n Note) bool { return a.IsAdmin() || n.Owner == a.Username }

type Note struct {
	ID        int64     `json:"id"`
	Owner     string    `json:"owner"`
	Title     string    `json:"title"`
	Body      string    `json:"body"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

const MaxTitleLen = 100

// Validate menjaga aturan bisnis di satu tempat (bukan di handler).
func (n *Note) Validate() error {
	n.Title = strings.TrimSpace(n.Title)
	switch {
	case n.Title == "":
		return errors.Join(ErrValidation, errors.New("title wajib diisi"))
	case len([]rune(n.Title)) > MaxTitleLen:
		return errors.Join(ErrValidation, errors.New("title maksimal 100 karakter"))
	case n.Owner == "":
		return errors.Join(ErrValidation, errors.New("owner wajib diisi"))
	}
	return nil
}
