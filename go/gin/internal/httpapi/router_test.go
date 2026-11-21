package httpapi_test

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"net/url"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/kucingops/catsheet/go/gin/internal/auth"
	"github.com/kucingops/catsheet/go/gin/internal/domain"
	"github.com/kucingops/catsheet/go/gin/internal/httpapi"
	"github.com/kucingops/catsheet/go/gin/internal/service"
	"github.com/kucingops/catsheet/go/gin/internal/store"
)

// Test end-to-end: server HTTP beneran (httptest.NewServer) di port acak,
// dirakit sama persis seperti main.go tapi dengan repo in-memory.
// Padanan @SpringBootTest(webEnvironment = RANDOM_PORT) + TestRestTemplate.

const apiKey = "test-api-key"

func newServer(t *testing.T) *httptest.Server {
	t.Helper()
	gin.SetMode(gin.TestMode)

	users := store.NewMemoryUserRepository()
	for _, u := range []struct {
		name  string
		roles []domain.Role
	}{
		{"budi", []domain.Role{domain.RoleUser}},
		{"siti", []domain.Role{domain.RoleUser}},
		{"admin", []domain.Role{domain.RoleUser, domain.RoleAdmin}},
	} {
		hash, _ := auth.HashPassword(u.name + "123")
		users.Save(t.Context(), domain.User{Username: u.name, PasswordHash: hash, Roles: u.roles})
	}
	keys := auth.NewAPIKeyAuth()
	keys.Register(apiKey, auth.Principal{Username: "reporting-service", Roles: []domain.Role{domain.RoleAdmin}})

	srv := httptest.NewServer(httpapi.NewRouter(httpapi.Deps{
		Notes:     service.NewNoteService(store.NewMemoryNoteRepository(), nil),
		Passwords: auth.NewPasswordChecker(users),
		Sessions:  auth.NewSessionStore(time.Minute),
		JWT:       auth.NewJWTIssuer([]byte("test-secret"), "catsheet", time.Minute),
		APIKeys:   keys,
	}))
	t.Cleanup(srv.Close)
	return srv
}

// client kecil biar test-nya enak dibaca.
type client struct {
	t    *testing.T
	base string
	http *http.Client
	auth func(*http.Request)
}

func newClient(t *testing.T, srv *httptest.Server, authFn func(*http.Request)) *client {
	jar, _ := cookiejar.New(nil) // simpan cookie seperti browser
	return &client{t: t, base: srv.URL, http: &http.Client{Jar: jar}, auth: authFn}
}

func (c *client) do(method, path, contentType, body string) (int, string) {
	c.t.Helper()
	req, _ := http.NewRequestWithContext(c.t.Context(), method, c.base+path, strings.NewReader(body))
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	if c.auth != nil {
		c.auth(req)
	}
	res, err := c.http.Do(req)
	if err != nil {
		c.t.Fatal(err)
	}
	defer res.Body.Close()
	b, _ := io.ReadAll(res.Body)
	return res.StatusCode, string(b)
}

func (c *client) json(method, path, body string) (int, string) {
	return c.do(method, path, "application/json", body)
}

func decode[T any](t *testing.T, s string) T { // fungsi generik kecil untuk test
	t.Helper()
	var v T
	if err := json.Unmarshal([]byte(s), &v); err != nil {
		t.Fatalf("decode %q: %v", s, err)
	}
	return v
}

func basicAuth(u, p string) func(*http.Request) {
	return func(r *http.Request) { r.SetBasicAuth(u, p) }
}

func bearer(token string) func(*http.Request) {
	return func(r *http.Request) { r.Header.Set("Authorization", "Bearer "+token) }
}

func getToken(t *testing.T, srv *httptest.Server, user, pass string) string {
	t.Helper()
	code, body := newClient(t, srv, nil).json(http.MethodPost, "/auth/jwt/token",
		`{"username":"`+user+`","password":"`+pass+`"}`)
	if code != http.StatusOK {
		t.Fatalf("login JWT gagal: %d %s", code, body)
	}
	return decode[struct{ AccessToken string }](t, body).AccessToken
}

func TestHealthIsPublic(t *testing.T) {
	code, _ := newClient(t, newServer(t), nil).json(http.MethodGet, "/health", "")
	if code != http.StatusOK {
		t.Errorf("code = %d", code)
	}
}

func TestBasicAuthFlow(t *testing.T) {
	srv := newServer(t)

	code, _ := newClient(t, srv, nil).json(http.MethodGet, "/api/basic/notes", "")
	if code != http.StatusUnauthorized {
		t.Errorf("tanpa login: %d", code)
	}

	c := newClient(t, srv, basicAuth("budi", "budi123"))
	code, body := c.json(http.MethodPost, "/api/basic/notes", `{"title":"via basic"}`)
	if code != http.StatusCreated {
		t.Fatalf("create: %d %s", code, body)
	}
	code, body = c.json(http.MethodGet, "/api/basic/me", "")
	if me := decode[auth.Principal](t, body); code != 200 || me.Method != "basic" {
		t.Errorf("me = %d %s", code, body)
	}
}

func TestSessionFlow(t *testing.T) {
	srv := newServer(t)
	c := newClient(t, srv, nil)

	form := url.Values{"username": {"budi"}, "password": {"budi123"}}.Encode()
	code, body := c.do(http.MethodPost, "/auth/session/login", "application/x-www-form-urlencoded", form)
	if code != http.StatusOK {
		t.Fatalf("login: %d %s", code, body)
	}

	// Cookie jar otomatis kirim cookie SESSION.
	code, body = c.json(http.MethodGet, "/api/session/me", "")
	if me := decode[auth.Principal](t, body); code != 200 || me.Method != "session" {
		t.Fatalf("me = %d %s", code, body)
	}

	// Cookie session TIDAK diterima di jalur yang khusus JWT.
	if code, _ := c.json(http.MethodGet, "/api/jwt/me", ""); code != http.StatusUnauthorized {
		t.Errorf("cookie di /api/jwt: %d, want 401", code)
	}

	c.json(http.MethodPost, "/auth/session/logout", "")
	if code, _ := c.json(http.MethodGet, "/api/session/me", ""); code != http.StatusUnauthorized {
		t.Errorf("setelah logout: %d, want 401", code)
	}
}

func TestSessionLogin_WrongPassword(t *testing.T) {
	c := newClient(t, newServer(t), nil)
	form := url.Values{"username": {"budi"}, "password": {"salah"}}.Encode()
	if code, _ := c.do(http.MethodPost, "/auth/session/login", "application/x-www-form-urlencoded", form); code != http.StatusUnauthorized {
		t.Errorf("code = %d", code)
	}
}

func TestJWTFlow(t *testing.T) {
	srv := newServer(t)
	c := newClient(t, srv, bearer(getToken(t, srv, "budi", "budi123")))

	code, body := c.json(http.MethodGet, "/api/jwt/me", "")
	if me := decode[auth.Principal](t, body); code != 200 || me.Username != "budi" || me.Method != "jwt" {
		t.Fatalf("me = %d %s", code, body)
	}

	bad := newClient(t, srv, bearer("token.palsu.banget"))
	if code, _ := bad.json(http.MethodGet, "/api/jwt/me", ""); code != http.StatusUnauthorized {
		t.Errorf("token palsu: %d", code)
	}
}

func TestCombinedGroup_AcceptsEveryMethod(t *testing.T) {
	srv := newServer(t)
	cases := map[string]func(*http.Request){
		"basic":  basicAuth("budi", "budi123"),
		"jwt":    bearer(getToken(t, srv, "budi", "budi123")),
		"apikey": func(r *http.Request) { r.Header.Set(auth.APIKeyHeader, apiKey) },
	}
	for method, authFn := range cases {
		t.Run(method, func(t *testing.T) {
			code, body := newClient(t, srv, authFn).json(http.MethodGet, "/api/me", "")
			if me := decode[auth.Principal](t, body); code != 200 || me.Method != method {
				t.Errorf("me = %d %s", code, body)
			}
		})
	}
}

func TestNotesCRUDAndOwnership(t *testing.T) {
	srv := newServer(t)
	budi := newClient(t, srv, basicAuth("budi", "budi123"))
	siti := newClient(t, srv, basicAuth("siti", "siti123"))

	code, body := budi.json(http.MethodPost, "/api/notes", `{"title":"punya budi","body":"isi"}`)
	if code != http.StatusCreated {
		t.Fatalf("create: %d %s", code, body)
	}
	id := decode[domain.Note](t, body).ID
	path := "/api/notes/" + itoa(id)

	tests := []struct {
		name     string
		c        *client
		method   string
		path     string
		body     string
		wantCode int
	}{
		{"validasi title kosong", budi, http.MethodPost, "/api/notes", `{"title":""}`, 400},
		{"json rusak", budi, http.MethodPost, "/api/notes", `{`, 400},
		{"id bukan angka", budi, http.MethodGet, "/api/notes/abc", "", 400},
		{"tidak ada", budi, http.MethodGet, "/api/notes/9999", "", 404},
		{"siti tidak boleh baca", siti, http.MethodGet, path, "", 403},
		{"siti tidak boleh ubah", siti, http.MethodPut, path, `{"title":"hack"}`, 403},
		{"siti tidak boleh hapus", siti, http.MethodDelete, path, "", 403},
		{"budi ubah", budi, http.MethodPut, path, `{"title":"diubah"}`, 200},
		{"budi baca", budi, http.MethodGet, path, "", 200},
		{"budi hapus", budi, http.MethodDelete, path, "", 204},
		{"sudah dihapus", budi, http.MethodGet, path, "", 404},
	}
	for _, tt := range tests {
		// Sengaja tanpa t.Run paralel: kasus-kasus ini berurutan (stateful).
		if code, body := tt.c.json(tt.method, tt.path, tt.body); code != tt.wantCode {
			t.Errorf("%s: code = %d, want %d (%s)", tt.name, code, tt.wantCode, body)
		}
	}

	if code, body := siti.json(http.MethodGet, "/api/notes", ""); code != 200 || body != "[]" {
		t.Errorf("list siti = %d %s, want []", code, body)
	}
}

func TestAdminStats(t *testing.T) {
	srv := newServer(t)
	newClient(t, srv, basicAuth("budi", "budi123")).json(http.MethodPost, "/api/notes", `{"title":"a"}`)

	tests := []struct {
		name     string
		auth     func(*http.Request)
		wantCode int
	}{
		{"tanpa login", nil, 401},
		{"user biasa via JWT", bearer(getToken(t, srv, "budi", "budi123")), 403},
		{"admin via Basic (jalur admin tidak terima Basic)", basicAuth("admin", "admin123"), 401},
		{"admin via JWT", bearer(getToken(t, srv, "admin", "admin123")), 200},
		{"service via API key", func(r *http.Request) { r.Header.Set(auth.APIKeyHeader, apiKey) }, 200},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			code, body := newClient(t, srv, tt.auth).json(http.MethodGet, "/api/admin/stats", "")
			if code != tt.wantCode {
				t.Fatalf("code = %d, want %d (%s)", code, tt.wantCode, body)
			}
			if code == 200 {
				if st := decode[service.Stats](t, body); st.TotalNotes != 1 {
					t.Errorf("stats = %+v", st)
				}
			}
		})
	}
}

func itoa(n int64) string { return strconv.FormatInt(n, 10) }
