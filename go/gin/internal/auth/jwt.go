package auth

import (
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"github.com/kucingops/catsheet/go/gin/internal/domain"
)

// JWT = token yang ditandatangani server dan dibawa client di header
// `Authorization: Bearer <token>`. Server TIDAK menyimpan apa pun (stateless),
// cukup verifikasi signature dan klaimnya.
//
// Trade-off yang sering ditanya interview:
//   + stateless, gampang di-scale, cocok untuk mobile/SPA/microservice
//   - tidak bisa di-revoke sebelum expired (kecuali pakai denylist = jadi stateful lagi)
//     -> makanya access token dibuat pendek (menit), plus refresh token.
//   - payload cuma base64, BUKAN terenkripsi. Jangan taruh data rahasia.

type Claims struct {
	Roles []domain.Role `json:"roles"`
	jwt.RegisteredClaims
}

type JWTIssuer struct {
	secret []byte
	issuer string
	ttl    time.Duration
	now    func() time.Time
}

func NewJWTIssuer(secret []byte, issuer string, ttl time.Duration) *JWTIssuer {
	return &JWTIssuer{secret: secret, issuer: issuer, ttl: ttl, now: time.Now}
}

func (j *JWTIssuer) TTL() time.Duration { return j.ttl }

func (j *JWTIssuer) Issue(p Principal) (string, error) {
	now := j.now()
	claims := Claims{
		Roles: p.Roles,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   p.Username,
			Issuer:    j.issuer,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(j.ttl)),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(j.secret)
}

func (j *JWTIssuer) Parse(token string) (Principal, error) {
	var claims Claims
	_, err := jwt.ParseWithClaims(token, &claims,
		func(*jwt.Token) (any, error) { return j.secret, nil },
		// WithValidMethods itu PENTING: menolak token dengan alg "none" atau
		// alg lain yang tidak kita harapkan (serangan algorithm confusion).
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithIssuer(j.issuer),
		jwt.WithExpirationRequired(),
		jwt.WithTimeFunc(j.now),
	)
	if err != nil {
		return Principal{}, fmt.Errorf("%w: %w", ErrBadCredentials, err) // wrap dua error sekaligus
	}
	return Principal{Username: claims.Subject, Roles: claims.Roles, Method: "jwt"}, nil
}

type JWTAuth struct {
	Issuer *JWTIssuer
}

func (JWTAuth) Name() string { return "jwt" }

func (a JWTAuth) Authenticate(r *http.Request) (Principal, error) {
	token, err := bearerToken(r.Header.Get("Authorization"))
	if err != nil {
		return Principal{}, err
	}
	return a.Issuer.Parse(token)
}

var errMalformedBearer = errors.New("authorization header bukan Bearer yang valid")

func bearerToken(header string) (string, error) {
	if header == "" {
		return "", ErrNoCredentials
	}
	scheme, token, ok := strings.Cut(header, " ")
	if !strings.EqualFold(scheme, "Bearer") {
		return "", ErrNoCredentials // mungkin "Basic ...", biar authenticator lain yang urus
	}
	token = strings.TrimSpace(token)
	if !ok || token == "" {
		return "", fmt.Errorf("%w: %w", ErrBadCredentials, errMalformedBearer)
	}
	return token, nil
}
