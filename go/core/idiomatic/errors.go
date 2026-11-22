package idiomatic

import (
	"errors"
	"fmt"
	"strings"
)

// Di Go, error adalah nilai biasa yang dikembalikan, bukan dilempar.
// Tidak ada try/catch dan tidak ada checked exception. Caller wajib
// memutuskan sendiri: tangani, bungkus dengan konteks, atau teruskan.

// Sentinel error: nilai tetap yang dicek dengan errors.Is.
// Padanannya di Java kira-kira `class NotFoundException`.
var (
	ErrNotFound  = errors.New("tidak ditemukan")
	ErrForbidden = errors.New("tidak boleh")
)

// ValidationError adalah error bertipe, untuk saat caller butuh detail.
// Dicek dengan errors.As.
type ValidationError struct {
	Field  string
	Reason string
}

func (e *ValidationError) Error() string {
	return fmt.Sprintf("%s: %s", e.Field, e.Reason)
}

var users = map[int]string{1: "budi", 2: "siti"}

// FindUser mengembalikan (nilai, error). Kalau error != nil, nilai diabaikan.
func FindUser(id int) (string, error) {
	if id <= 0 {
		return "", &ValidationError{Field: "id", Reason: "harus positif"}
	}
	name, ok := users[id]
	if !ok {
		// %w membungkus ErrNotFound sambil menambah konteks.
		// errors.Is(err, ErrNotFound) tetap true di caller.
		return "", fmt.Errorf("user %d: %w", id, ErrNotFound)
	}
	return name, nil
}

// Greet menunjukkan pola "bungkus lalu teruskan". Tiap lapisan menambah
// konteks, mirip stack trace tapi ditulis manusia.
func Greet(id int) (string, error) {
	name, err := FindUser(id)
	if err != nil {
		return "", fmt.Errorf("greet: %w", err)
	}
	return "halo " + name, nil
}

// HTTPStatus contoh mapping error ke status, seperti @ControllerAdvice.
// Di app Gin, padanannya ada di gin/internal/httpapi.
func HTTPStatus(err error) int {
	var ve *ValidationError
	switch {
	case err == nil:
		return 200
	case errors.As(err, &ve):
		return 400
	case errors.Is(err, ErrNotFound):
		return 404
	case errors.Is(err, ErrForbidden):
		return 403
	default:
		return 500
	}
}

// ValidateSignup mengumpulkan beberapa error sekaligus dengan errors.Join.
// errors.Is/As tetap bisa menemukan masing-masing error di dalamnya.
func ValidateSignup(username, password string) error {
	var errs []error
	if strings.TrimSpace(username) == "" {
		errs = append(errs, &ValidationError{Field: "username", Reason: "wajib diisi"})
	}
	if len(password) < 8 {
		errs = append(errs, &ValidationError{Field: "password", Reason: "minimal 8 karakter"})
	}
	return errors.Join(errs...) // nil kalau errs kosong
}

// ---- Jebakan interview: interface error berisi nil pointer bukan nil ----

// FindBuggy selalu mengembalikan error != nil, karena interface berisi
// (type=*ValidationError, value=nil). Interface baru nil kalau type DAN
// value-nya nil.
func FindBuggy(fail bool) error {
	var p *ValidationError
	if fail {
		p = &ValidationError{Field: "x", Reason: "gagal"}
	}
	return p // BUG
}

// FindFixed mengembalikan literal nil kalau tidak ada error.
func FindFixed(fail bool) error {
	if fail {
		return &ValidationError{Field: "x", Reason: "gagal"}
	}
	return nil
}
