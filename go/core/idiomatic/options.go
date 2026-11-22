package idiomatic

import (
	"errors"
	"time"
)

// Functional options: cara Go menangani konfigurasi opsional tanpa
// overloading constructor dan tanpa builder class.
//
// Java biasanya pakai Builder (`Client.builder().timeout(..).build()`) atau
// beberapa constructor overload. Go tidak punya overloading, jadi polanya:
// satu fungsi New dengan argumen wajib + variadic ...Option.

type Client struct {
	baseURL string
	timeout time.Duration
	retries int
	userAgt string
}

// Option adalah fungsi yang mengubah Client. Bisa gagal, jadi return error.
type Option func(*Client) error

func WithTimeout(d time.Duration) Option {
	return func(c *Client) error {
		if d <= 0 {
			return errors.New("timeout harus positif")
		}
		c.timeout = d
		return nil
	}
}

func WithRetries(n int) Option {
	return func(c *Client) error {
		if n < 0 {
			return errors.New("retries tidak boleh negatif")
		}
		c.retries = n
		return nil
	}
}

func WithUserAgent(ua string) Option {
	return func(c *Client) error { c.userAgt = ua; return nil }
}

// NewClient: argumen wajib di depan, opsional lewat opts.
// Default ditulis sekali di sini, jadi pemanggil cukup NewClient(url).
func NewClient(baseURL string, opts ...Option) (*Client, error) {
	if baseURL == "" {
		return nil, errors.New("baseURL wajib diisi")
	}
	c := &Client{
		baseURL: baseURL,
		timeout: 10 * time.Second,
		retries: 3,
		userAgt: "catsheet/1.0",
	}
	for _, opt := range opts {
		if err := opt(c); err != nil {
			return nil, err
		}
	}
	return c, nil
}

func (c *Client) Timeout() time.Duration { return c.timeout }
func (c *Client) Retries() int           { return c.retries }
func (c *Client) UserAgent() string      { return c.userAgt }

// Catatan: kalau opsinya banyak dan tidak perlu validasi, struct Config biasa
// (`NewClient(url, Config{Timeout: 5 * time.Second})`) juga idiomatis dan
// lebih sederhana. Functional options cocok untuk API library publik.
