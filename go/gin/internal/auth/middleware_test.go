package auth

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"

	"github.com/kucingops/catsheet/go/gin/internal/domain"
)

func init() { gin.SetMode(gin.TestMode) }

// stubAuth: Authenticator palsu. Karena Authenticator itu interface, test
// middleware tidak perlu bcrypt, JWT, atau session beneran.
type stubAuth struct {
	name string
	p    Principal
	err  error
}

func (s stubAuth) Name() string                                  { return s.name }
func (s stubAuth) Authenticate(*http.Request) (Principal, error) { return s.p, s.err }

func serve(h ...gin.HandlerFunc) *httptest.ResponseRecorder {
	r := gin.New()
	h = append(h, func(c *gin.Context) {
		p, _ := PrincipalFrom(c)
		c.JSON(http.StatusOK, p)
	})
	r.GET("/", h...)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/", nil))
	return w
}

func TestAuthenticate_Chain(t *testing.T) {
	skip := stubAuth{name: "a", err: ErrNoCredentials}
	reject := stubAuth{name: "b", err: ErrBadCredentials}
	accept := stubAuth{name: "c", p: Principal{Username: "budi", Method: "c"}}

	tests := []struct {
		name     string
		chain    []Authenticator
		wantCode int
		wantUser string
	}{
		{"lewati yang tidak punya kredensial", []Authenticator{skip, accept}, 200, "budi"},
		{"kredensial salah tidak di-fallback", []Authenticator{reject, accept}, 401, ""},
		{"tidak ada yang cocok", []Authenticator{skip}, 401, ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := serve(Authenticate(tt.chain...))
			if w.Code != tt.wantCode {
				t.Fatalf("code = %d, want %d", w.Code, tt.wantCode)
			}
			if tt.wantUser != "" {
				var p Principal
				json.Unmarshal(w.Body.Bytes(), &p)
				if p.Username != tt.wantUser {
					t.Errorf("user = %q", p.Username)
				}
			}
		})
	}
}

func TestAuthenticate_BasicChallengeHeader(t *testing.T) {
	w := serve(Authenticate(stubAuth{name: "basic", err: ErrNoCredentials}))
	if w.Header().Get("WWW-Authenticate") == "" {
		t.Error("harus kirim WWW-Authenticate kalau Basic diterima")
	}
}

func TestRequireRole(t *testing.T) {
	user := stubAuth{name: "x", p: Principal{Username: "budi", Roles: []domain.Role{domain.RoleUser}}}
	admin := stubAuth{name: "x", p: Principal{Username: "root", Roles: []domain.Role{domain.RoleAdmin}}}

	if w := serve(Authenticate(user), RequireRole(domain.RoleAdmin)); w.Code != http.StatusForbidden {
		t.Errorf("user ke endpoint admin: code = %d, want 403", w.Code)
	}
	if w := serve(Authenticate(admin), RequireRole(domain.RoleAdmin)); w.Code != http.StatusOK {
		t.Errorf("admin: code = %d, want 200", w.Code)
	}
	if w := serve(RequireRole(domain.RoleAdmin)); w.Code != http.StatusUnauthorized {
		t.Errorf("tanpa login: code = %d, want 401", w.Code)
	}
}
