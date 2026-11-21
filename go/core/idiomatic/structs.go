package idiomatic

import (
	"fmt"
	"strings"
	"sync"
)

// ---- Struct biasa: data dulu, method secukupnya ----

// Point cuma data. Field-nya exported, tanpa getter/setter. Di Go, getter
// baru ditulis kalau memang ada invariant yang harus dijaga.
type Point struct {
	X, Y int
}

// Add pakai value receiver: Point kecil dan immutable, jadi salinan itu murah
// dan aman dipakai bareng goroutine lain.
func (p Point) Add(q Point) Point { return Point{p.X + q.X, p.Y + q.Y} }

// ---- Zero value yang langsung bisa dipakai ----

// Counter bisa langsung dipakai tanpa constructor: `var c Counter` sudah siap.
// sync.Mutex dan map yang di-lazy-init membuat zero value-nya valid.
// Ini kebalikan dari Java, yang biasanya butuh `new Counter()` + init di
// constructor. Pepatah Go: "Make the zero value useful."
type Counter struct {
	mu     sync.Mutex
	counts map[string]int
}

// Inc pakai pointer receiver karena mengubah state dan Counter berisi mutex
// (mutex tidak boleh disalin).
func (c *Counter) Inc(key string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.counts == nil {
		c.counts = make(map[string]int)
	}
	c.counts[key]++
}

func (c *Counter) Get(key string) int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.counts[key] // map nil boleh dibaca, hasilnya 0
}

// ---- Constructor cuma kalau perlu validasi ----

// Money menyimpan nilai dalam satuan terkecil (jangan float untuk uang).
// Field unexported karena ada aturan: currency wajib 3 huruf kapital.
type Money struct {
	amount   int64
	currency string
}

// NewMoney adalah fungsi biasa yang mengembalikan (nilai, error).
// Go tidak punya constructor bawaan; NewXxx itu konvensi, bukan keyword.
func NewMoney(amount int64, currency string) (Money, error) {
	if len(currency) != 3 || strings.ToUpper(currency) != currency {
		return Money{}, fmt.Errorf("currency tidak valid: %q", currency)
	}
	return Money{amount: amount, currency: currency}, nil
}

func (m Money) Amount() int64    { return m.amount }
func (m Money) Currency() string { return m.currency }
func (m Money) String() string   { return fmt.Sprintf("%d %s", m.amount, m.currency) }

// ---- Embedding: komposisi, bukan inheritance ----

// Logger menulis baris dengan prefix.
type Logger struct {
	Prefix string
	lines  []string
}

func (l *Logger) Log(msg string)  { l.lines = append(l.lines, l.Prefix+msg) }
func (l *Logger) Lines() []string { return l.lines }

// Service meng-embed *Logger, jadi s.Log(...) bisa dipanggil langsung
// (method "dipromosikan"). Tapi Service BUKAN Logger: tidak ada subtype,
// tidak ada upcast, dan tidak ada virtual dispatch. Ini cuma singkatan dari
// s.Logger.Log(...).
type Service struct {
	*Logger
	Name string
}

func (s Service) Start() { s.Log(s.Name + " start") }

// ---- Jebakan interview: embedding tidak punya virtual dispatch ----

type Base struct{}

func (Base) Kind() string       { return "base" }
func (b Base) Describe() string { return "aku " + b.Kind() }

type Derived struct{ Base }

func (Derived) Kind() string { return "derived" }

// Derived{}.Describe() mengembalikan "aku base", bukan "aku derived".
// Describe punya receiver Base, jadi b.Kind() selalu Base.Kind.
// Di Java, hasilnya "aku derived" karena method virtual.
// Kalau butuh perilaku yang bisa diganti, oper interface atau fungsi.
