package oop

import (
	"fmt"
	"math"
)

// Shape itu interface. Bedanya sama Java: type TIDAK perlu bilang
// "implements Shape". Selama punya method Area() dan Name() dengan signature
// yang sama, otomatis dianggap Shape (structural typing / "duck typing" tapi
// dicek saat compile).
//
// Konvensi Go: interface kecil (1-3 method), dan didefinisikan di sisi yang
// MEMAKAI, bukan di sisi yang mengimplementasi. Lihat store.NoteRepository
// di folder gin untuk contoh nyatanya.
type Shape interface {
	Area() float64
	Name() string
}

type Rectangle struct{ W, H float64 }
type Circle struct{ R float64 }

func (r Rectangle) Area() float64 { return r.W * r.H }
func (r Rectangle) Name() string  { return "rectangle" }
func (c Circle) Area() float64    { return math.Pi * c.R * c.R }
func (c Circle) Name() string     { return "circle" }

// Compile-time assertion: kalau Rectangle berhenti memenuhi Shape, build gagal.
// Ini cara "explicit implements" kalau kamu kangen Java.
var (
	_ Shape = Rectangle{}
	_ Shape = Circle{}
)

// TotalArea itu polymorphism: satu fungsi, banyak bentuk konkret.
func TotalArea(shapes ...Shape) float64 {
	var total float64
	for _, s := range shapes {
		total += s.Area() // dynamic dispatch lewat interface
	}
	return total
}

// Describe nunjukin type switch, padanan instanceof + pattern matching di Java 21.
func Describe(s Shape) string {
	switch v := s.(type) {
	case Rectangle:
		if v.W == v.H {
			return fmt.Sprintf("persegi %gx%g", v.W, v.H)
		}
		return fmt.Sprintf("persegi panjang %gx%g", v.W, v.H)
	case Circle:
		return fmt.Sprintf("lingkaran r=%g", v.R)
	case nil:
		return "nil"
	default:
		return "shape lain: " + v.Name()
	}
}

// ---- Gotcha interview: interface yang isinya nil pointer BUKAN nil ----

type MyErr struct{}

func (*MyErr) Error() string { return "my error" }

// FindBuggy kelihatannya mengembalikan nil, tapi sebenarnya mengembalikan
// interface error yang berisi (type=*MyErr, value=nil). Interface baru == nil
// kalau type DAN value-nya nil.
func FindBuggy(fail bool) error {
	var p *MyErr
	if fail {
		p = &MyErr{}
	}
	return p // BUG: selalu != nil
}

// FindFixed: kembalikan literal nil kalau memang nggak ada error.
func FindFixed(fail bool) error {
	if fail {
		return &MyErr{}
	}
	return nil
}
