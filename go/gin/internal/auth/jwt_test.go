package auth

import (
	"errors"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"github.com/kucingops/catsheet/go/gin/internal/domain"
)

var budi = Principal{Username: "budi", Roles: []domain.Role{domain.RoleUser}}

func TestJWT_RoundTrip(t *testing.T) {
	j := NewJWTIssuer([]byte("secret"), "catsheet", 15*time.Minute)
	token, err := j.Issue(budi)
	if err != nil {
		t.Fatal(err)
	}
	p, err := j.Parse(token)
	if err != nil {
		t.Fatal(err)
	}
	if p.Username != "budi" || p.Method != "jwt" || len(p.Roles) != 1 {
		t.Errorf("p = %+v", p)
	}
}

func TestJWT_Rejects(t *testing.T) {
	now := time.Date(2026, 11, 21, 8, 0, 0, 0, time.UTC)
	j := NewJWTIssuer([]byte("secret"), "catsheet", 15*time.Minute)
	j.now = func() time.Time { return now } // test internal: bisa ganti field unexported

	valid, _ := j.Issue(budi)

	other := NewJWTIssuer([]byte("secret-lain"), "catsheet", time.Minute)
	wrongSecret, _ := other.Issue(budi)

	otherIss := NewJWTIssuer([]byte("secret"), "penipu", time.Minute)
	wrongIssuer, _ := otherIss.Issue(budi)

	// Token alg "none": serangan klasik. Library harus menolak.
	none, _ := jwt.NewWithClaims(jwt.SigningMethodNone, Claims{
		RegisteredClaims: jwt.RegisteredClaims{Subject: "admin", Issuer: "catsheet",
			ExpiresAt: jwt.NewNumericDate(now.Add(time.Hour))},
	}).SignedString(jwt.UnsafeAllowNoneSignatureType)

	tests := []struct {
		name  string
		token string
		at    time.Time
	}{
		{"expired", valid, now.Add(16 * time.Minute)},
		{"secret beda", wrongSecret, now},
		{"issuer beda", wrongIssuer, now},
		{"alg none", none, now},
		{"sampah", "bukan.token.jwt", now},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			j.now = func() time.Time { return tt.at }
			_, err := j.Parse(tt.token)
			if !errors.Is(err, ErrBadCredentials) {
				t.Errorf("err = %v, want ErrBadCredentials", err)
			}
		})
	}
}

func TestBearerToken(t *testing.T) {
	tests := []struct {
		header string
		want   string
		err    error
	}{
		{"", "", ErrNoCredentials},
		{"Basic abc", "", ErrNoCredentials},
		{"Bearer abc", "abc", nil},
		{"bearer abc", "abc", nil}, // scheme case-insensitive (RFC 7235)
		{"Bearer", "", ErrBadCredentials},
		{"Bearer    ", "", ErrBadCredentials},
	}
	for _, tt := range tests {
		got, err := bearerToken(tt.header)
		if got != tt.want || !errors.Is(err, tt.err) {
			t.Errorf("bearerToken(%q) = %q, %v; want %q, %v", tt.header, got, err, tt.want, tt.err)
		}
	}
}
