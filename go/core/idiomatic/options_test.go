package idiomatic

import (
	"testing"
	"time"
)

func TestNewClientDefaults(t *testing.T) {
	c, err := NewClient("https://api.example.com")
	if err != nil {
		t.Fatal(err)
	}
	if c.Timeout() != 10*time.Second || c.Retries() != 3 || c.UserAgent() != "catsheet/1.0" {
		t.Fatalf("default salah: %+v", c)
	}
}

func TestNewClientOptions(t *testing.T) {
	c, err := NewClient("https://api.example.com",
		WithTimeout(2*time.Second),
		WithRetries(0),
		WithUserAgent("test"),
	)
	if err != nil {
		t.Fatal(err)
	}
	if c.Timeout() != 2*time.Second || c.Retries() != 0 || c.UserAgent() != "test" {
		t.Fatalf("opsi tidak diterapkan: %+v", c)
	}
}

func TestNewClientInvalidOption(t *testing.T) {
	for name, opt := range map[string]Option{
		"timeout": WithTimeout(0),
		"retries": WithRetries(-1),
	} {
		if _, err := NewClient("https://x", opt); err == nil {
			t.Errorf("%s: mau error", name)
		}
	}
	if _, err := NewClient(""); err == nil {
		t.Error("baseURL kosong: mau error")
	}
}
