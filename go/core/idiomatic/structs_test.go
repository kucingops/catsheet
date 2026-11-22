package idiomatic

import (
	"sync"
	"testing"
)

func TestPointAddIsValueSemantics(t *testing.T) {
	p := Point{1, 2}
	q := p.Add(Point{3, 4})
	if p != (Point{1, 2}) {
		t.Fatalf("p berubah: %v", p)
	}
	if q != (Point{4, 6}) {
		t.Fatalf("q = %v", q)
	}
}

func TestCounterZeroValueIsUsable(t *testing.T) {
	var c Counter // tanpa constructor
	if got := c.Get("x"); got != 0 {
		t.Fatalf("Get pada zero value = %d", got)
	}
	var wg sync.WaitGroup
	for range 100 {
		wg.Go(func() { c.Inc("x") })
	}
	wg.Wait()
	if got := c.Get("x"); got != 100 {
		t.Fatalf("Get = %d, mau 100", got)
	}
}

func TestNewMoney(t *testing.T) {
	tests := []struct {
		name     string
		currency string
		wantErr  bool
	}{
		{"valid", "IDR", false},
		{"huruf kecil", "idr", true},
		{"kepanjangan", "IDRX", true},
		{"kosong", "", true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			m, err := NewMoney(1000, tt.currency)
			if (err != nil) != tt.wantErr {
				t.Fatalf("err = %v, wantErr %v", err, tt.wantErr)
			}
			if !tt.wantErr && m.String() != "1000 IDR" {
				t.Fatalf("String() = %q", m.String())
			}
		})
	}
}

func TestEmbeddingPromotesMethods(t *testing.T) {
	s := Service{Logger: &Logger{Prefix: "[svc] "}, Name: "notes"}
	s.Start()
	s.Log("manual")
	got := s.Lines()
	if len(got) != 2 || got[0] != "[svc] notes start" || got[1] != "[svc] manual" {
		t.Fatalf("lines = %v", got)
	}
}

func TestEmbeddingHasNoVirtualDispatch(t *testing.T) {
	d := Derived{}
	if d.Kind() != "derived" {
		t.Fatalf("Kind = %q", d.Kind())
	}
	if got := d.Describe(); got != "aku base" {
		t.Fatalf("Describe = %q, mau %q (tidak ada virtual dispatch)", got, "aku base")
	}
}
