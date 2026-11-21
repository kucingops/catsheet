package idiomatic

import (
	"bytes"
	"errors"
	"strings"
	"testing"
)

// fakeLookup memenuhi emailLookup tanpa mockito: cukup map.
type fakeLookup map[string]string

func (f fakeLookup) Email(u string) (string, bool) { e, ok := f[u]; return e, ok }

func TestNotifierWithFake(t *testing.T) {
	var buf bytes.Buffer
	n := NewNotifier(fakeLookup{"budi": "budi@example.com"}, &buf)
	if err := n.Notify("budi", "halo"); err != nil {
		t.Fatal(err)
	}
	if got := buf.String(); got != "to=budi@example.com msg=halo\n" {
		t.Fatalf("output = %q", got)
	}
	if err := n.Notify("siti", "halo"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("err = %v, mau ErrNotFound", err)
	}
}

func TestNotifierWithRealStore(t *testing.T) {
	var buf bytes.Buffer
	n := NewNotifier(NewUserStore(map[string]string{"siti": "s@example.com"}), &buf)
	if err := n.Notify("siti", "hai"); err != nil {
		t.Fatal(err)
	}
}

func TestCountWords(t *testing.T) {
	got, err := CountWords(strings.NewReader("go itu  sederhana\n tapi tegas"))
	if err != nil || got != 5 {
		t.Fatalf("CountWords = %d, %v", got, err)
	}
}

func TestDescribe(t *testing.T) {
	m, _ := NewMoney(5, "IDR")
	tests := []struct {
		in   any
		want string
	}{
		{nil, "nil"},
		{42, "int 42"},
		{m, "stringer 5 IDR"},
		{ErrNotFound, "error tidak ditemukan"},
		{3.14, "lainnya float64"},
	}
	for _, tt := range tests {
		if got := Describe(tt.in); got != tt.want {
			t.Errorf("Describe(%v) = %q, mau %q", tt.in, got, tt.want)
		}
	}
}
