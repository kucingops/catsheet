package idiomatic

import (
	"errors"
	"testing"
)

func TestErrorsIsSurvivesWrapping(t *testing.T) {
	_, err := Greet(99)
	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("errors.Is(%v, ErrNotFound) = false", err)
	}
	if got, want := err.Error(), "greet: user 99: tidak ditemukan"; got != want {
		t.Fatalf("pesan = %q, mau %q", got, want)
	}
}

func TestErrorsAsExtractsDetail(t *testing.T) {
	_, err := Greet(-1)
	var ve *ValidationError
	if !errors.As(err, &ve) {
		t.Fatalf("errors.As gagal untuk %v", err)
	}
	if ve.Field != "id" {
		t.Fatalf("Field = %q", ve.Field)
	}
}

func TestHTTPStatus(t *testing.T) {
	_, notFound := Greet(99)
	_, invalid := Greet(0)
	tests := []struct {
		err  error
		want int
	}{
		{nil, 200},
		{invalid, 400},
		{notFound, 404},
		{ErrForbidden, 403},
		{errors.New("db down"), 500},
	}
	for _, tt := range tests {
		if got := HTTPStatus(tt.err); got != tt.want {
			t.Errorf("HTTPStatus(%v) = %d, mau %d", tt.err, got, tt.want)
		}
	}
}

func TestValidateSignupJoin(t *testing.T) {
	if err := ValidateSignup("budi", "rahasia123"); err != nil {
		t.Fatalf("input valid tapi err = %v", err)
	}
	err := ValidateSignup(" ", "123")
	var ve *ValidationError
	if !errors.As(err, &ve) {
		t.Fatalf("errors.As gagal untuk %v", err)
	}
	joined, ok := err.(interface{ Unwrap() []error })
	if !ok || len(joined.Unwrap()) != 2 {
		t.Fatalf("mau 2 error tergabung, dapat %v", err)
	}
}

func TestTypedNilTrap(t *testing.T) {
	if FindBuggy(false) == nil {
		t.Fatal("FindBuggy(false) ternyata nil; jebakannya hilang?")
	}
	if FindFixed(false) != nil {
		t.Fatal("FindFixed(false) harus nil")
	}
}
