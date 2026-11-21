package oop

// Counter dipakai buat nunjukin beda value receiver vs pointer receiver.
type Counter struct{ n int }

// IncValue pakai value receiver: c adalah SALINAN, jadi perubahan hilang.
func (c Counter) IncValue() { c.n++ }

// IncPointer pakai pointer receiver: mengubah Counter aslinya.
func (c *Counter) IncPointer() { c.n++ }

func (c Counter) Value() int { return c.n }

// Incrementer cuma dipenuhi oleh *Counter, bukan Counter.
//
// Aturan method set:
//   - method set T   = method dengan receiver T
//   - method set *T  = method dengan receiver T DAN *T
//
// Jadi Counter{} TIDAK bisa dimasukkan ke variabel Incrementer, tapi &Counter{} bisa.
type Incrementer interface {
	IncPointer()
	Value() int
}

var _ Incrementer = (*Counter)(nil)

// var _ Incrementer = Counter{} // <- compile error, coba uncomment

// Kapan pakai pointer receiver?
//   1. Method mengubah state.
//   2. Struct-nya besar (hindari copy).
//   3. Struct berisi sync.Mutex atau field lain yang nggak boleh di-copy.
// Konsisten: kalau satu method pakai pointer, biasanya semua ikut pointer.
