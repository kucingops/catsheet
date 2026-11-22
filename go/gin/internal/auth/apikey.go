package auth

import (
	"crypto/sha256"
	"net/http"
)

// APIKeyAuth: header `X-API-Key: <key>`. Biasanya untuk service-to-service
// atau integrasi pihak ketiga, bukan untuk manusia.
//
// Key disimpan dalam bentuk hash SHA-256, bukan plaintext. Kalau tabel/config
// bocor, key aslinya tidak ikut bocor. (Untuk API key yang acak dan panjang,
// SHA-256 cukup; bcrypt dipakai untuk password manusia yang entropinya rendah.)
// Karena lookup-nya by hash, waktu map lookup tidak membocorkan isi key asli.
type APIKeyAuth struct {
	keys map[[32]byte]Principal
}

const APIKeyHeader = "X-API-Key"

func NewAPIKeyAuth() *APIKeyAuth { return &APIKeyAuth{keys: map[[32]byte]Principal{}} }

// Register mendaftarkan key untuk satu "client". Di dunia nyata key ini
// dibaca dari DB atau secret manager.
func (a *APIKeyAuth) Register(rawKey string, p Principal) {
	p.Method = "apikey"
	a.keys[sha256.Sum256([]byte(rawKey))] = p
}

func (*APIKeyAuth) Name() string { return "apikey" }

func (a *APIKeyAuth) Authenticate(r *http.Request) (Principal, error) {
	key := r.Header.Get(APIKeyHeader)
	if key == "" {
		return Principal{}, ErrNoCredentials
	}
	p, ok := a.keys[sha256.Sum256([]byte(key))]
	if !ok {
		return Principal{}, ErrBadCredentials
	}
	return p, nil
}
