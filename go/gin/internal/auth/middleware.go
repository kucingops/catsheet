package auth

import (
	"errors"
	"net/http"
	"slices"

	"github.com/gin-gonic/gin"

	"github.com/kucingops/catsheet/go/gin/internal/domain"
)

const principalKey = "auth.principal"

// Authenticate membuat middleware Gin dari satu atau lebih Authenticator.
// Urutannya penting: dicoba satu per satu, yang pertama mengenali
// kredensialnya yang menang. Mirip urutan filter di SecurityFilterChain.
//
//   - ErrNoCredentials  -> lanjut ke authenticator berikutnya
//   - error lain        -> langsung 401 (jangan fallback, nanti membingungkan)
//   - semua dilewati    -> 401
func Authenticate(auths ...Authenticator) gin.HandlerFunc {
	return func(c *gin.Context) {
		for _, a := range auths {
			p, err := a.Authenticate(c.Request)
			if errors.Is(err, ErrNoCredentials) {
				continue
			}
			if err != nil {
				abortUnauthorized(c, auths, "kredensial "+a.Name()+" tidak valid")
				return
			}
			c.Set(principalKey, p)
			c.Next()
			return
		}
		abortUnauthorized(c, auths, "butuh login")
	}
}

func abortUnauthorized(c *gin.Context, auths []Authenticator, msg string) {
	// Kalau Basic termasuk metode yang diterima, kasih tahu client lewat
	// header standar supaya browser/curl tahu harus kirim Basic.
	if slices.ContainsFunc(auths, func(a Authenticator) bool { return a.Name() == "basic" }) {
		c.Header("WWW-Authenticate", `Basic realm="catsheet"`)
	}
	c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": msg})
}

// RequireRole: 401 = "kamu siapa?", 403 = "aku tahu kamu siapa, tapi nggak boleh".
func RequireRole(role domain.Role) gin.HandlerFunc {
	return func(c *gin.Context) {
		p, ok := PrincipalFrom(c)
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "butuh login"})
			return
		}
		if !slices.Contains(p.Roles, role) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "butuh role " + string(role)})
			return
		}
		c.Next()
	}
}

// PrincipalFrom mengambil principal dari context. Padanan
// SecurityContextHolder.getContext().getAuthentication().
func PrincipalFrom(c *gin.Context) (Principal, bool) {
	v, ok := c.Get(principalKey)
	if !ok {
		return Principal{}, false
	}
	p, ok := v.(Principal) // type assertion dengan "comma ok", tidak panic kalau salah tipe
	return p, ok
}
