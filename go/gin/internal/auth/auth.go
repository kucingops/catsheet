// Package auth berisi beberapa cara login yang hidup berdampingan dalam satu
// aplikasi. Padanan Spring Security:
//
//	Authenticator (interface)   ~ AuthenticationProvider / AuthenticationFilter
//	BasicAuth                   ~ httpBasic()
//	SessionAuth + SessionStore  ~ formLogin() + HttpSession
//	JWTAuth + JWTIssuer         ~ oauth2ResourceServer().jwt()
//	APIKeyAuth                  ~ custom filter untuk machine-to-machine
//	Middleware Authenticate     ~ SecurityFilterChain per path
//	RequireRole                 ~ .hasRole("ADMIN") / @PreAuthorize
//
// Logika autentikasi di package ini hanya bergantung ke *http.Request, bukan
// ke Gin, jadi bisa di-test tanpa server dan bisa dipindah ke framework lain.
// Yang terikat ke Gin cuma middleware.go.
package auth

import (
	"context"
	"errors"
	"net/http"

	"golang.org/x/crypto/bcrypt"

	"github.com/kucingops/catsheet/go/gin/internal/domain"
	"github.com/kucingops/catsheet/go/gin/internal/store"
)

var (
	// ErrNoCredentials: request ini tidak membawa kredensial untuk metode ini.
	// Artinya "coba authenticator berikutnya", bukan "tolak".
	ErrNoCredentials = errors.New("no credentials")
	// ErrBadCredentials: kredensial ada tapi salah/kedaluwarsa. Langsung tolak.
	ErrBadCredentials = errors.New("bad credentials")
)

// Principal itu "siapa yang login dan lewat apa".
type Principal struct {
	Username string        `json:"username"`
	Roles    []domain.Role `json:"roles"`
	Method   string        `json:"method"` // basic | session | jwt | apikey
}

func (p Principal) Actor() domain.Actor {
	return domain.Actor{Username: p.Username, Roles: p.Roles}
}

// Authenticator itu Strategy pattern. Tiap metode login cuma perlu memenuhi
// dua method ini, dan middleware bisa merangkai beberapa sekaligus.
type Authenticator interface {
	Name() string
	Authenticate(r *http.Request) (Principal, error)
}

// PasswordChecker dipakai bareng oleh Basic, session login, dan JWT login.
type PasswordChecker struct {
	users store.UserRepository
}

func NewPasswordChecker(users store.UserRepository) *PasswordChecker {
	return &PasswordChecker{users: users}
}

// dummyHash dipakai kalau username tidak ditemukan, supaya waktu respons
// "user tidak ada" dan "password salah" sama lamanya. Tanpa ini, penyerang
// bisa menebak username mana yang valid dari waktu respons (timing attack).
var dummyHash, _ = bcrypt.GenerateFromPassword([]byte("dummy-password"), bcrypt.DefaultCost)

func (c *PasswordChecker) Check(ctx context.Context, username, password string) (domain.User, error) {
	u, err := c.users.FindByUsername(ctx, username)
	if err != nil {
		bcrypt.CompareHashAndPassword(dummyHash, []byte(password))
		return domain.User{}, ErrBadCredentials
	}
	if bcrypt.CompareHashAndPassword(u.PasswordHash, []byte(password)) != nil {
		return domain.User{}, ErrBadCredentials
	}
	return u, nil
}

// HashPassword: bcrypt sudah termasuk salt acak di dalam hasilnya.
// Padanan BCryptPasswordEncoder di Spring.
func HashPassword(password string) ([]byte, error) {
	return bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
}
