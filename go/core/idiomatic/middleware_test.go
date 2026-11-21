package idiomatic

import (
	"bytes"
	"errors"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestChainOrder(t *testing.T) {
	var order []string
	mark := func(name string) Middleware {
		return func(next http.Handler) http.Handler {
			return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				order = append(order, name)
				next.ServeHTTP(w, r)
			})
		}
	}
	h := Chain(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		order = append(order, "handler")
	}), mark("A"), mark("B"))

	h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest("GET", "/", nil))
	if got := strings.Join(order, ","); got != "A,B,handler" {
		t.Fatalf("urutan = %s", got)
	}
}

func TestRequireAPIKeyAndLogging(t *testing.T) {
	var logs bytes.Buffer
	logger := slog.New(slog.NewTextHandler(&logs, nil))
	h := Chain(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		c, _ := ClientFrom(r.Context())
		w.Write([]byte("hai " + c))
	}), Logging(logger), RequireAPIKey(map[string]string{"k1": "reporting"}))

	tests := []struct {
		key      string
		wantCode int
		wantBody string
	}{
		{"k1", 200, "hai reporting"},
		{"salah", 401, "unauthorized\n"},
		{"", 401, "unauthorized\n"},
	}
	for _, tt := range tests {
		req := httptest.NewRequest("GET", "/stats", nil)
		if tt.key != "" {
			req.Header.Set("X-API-Key", tt.key)
		}
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		if rec.Code != tt.wantCode || rec.Body.String() != tt.wantBody {
			t.Errorf("key %q: %d %q", tt.key, rec.Code, rec.Body.String())
		}
	}
	if n := strings.Count(logs.String(), "path=/stats"); n != 3 {
		t.Fatalf("mau 3 baris log, dapat %d:\n%s", n, logs.String())
	}
}

func TestRetry(t *testing.T) {
	calls := 0
	err := Retry(3, func() error {
		calls++
		if calls < 3 {
			return errors.New("belum")
		}
		return nil
	})
	if err != nil || calls != 3 {
		t.Fatalf("err=%v calls=%d", err, calls)
	}
	if err := Retry(2, func() error { return ErrForbidden }); !errors.Is(err, ErrForbidden) {
		t.Fatalf("err = %v", err)
	}
}
