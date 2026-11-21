package oop

import (
	"math"
	"testing"
)

func TestTotalArea(t *testing.T) {
	got := TotalArea(Rectangle{W: 2, H: 3}, Circle{R: 1})
	want := 6 + math.Pi
	if math.Abs(got-want) > 1e-9 {
		t.Errorf("TotalArea = %v, want %v", got, want)
	}
}

func TestDescribe(t *testing.T) {
	tests := map[string]struct {
		in   Shape
		want string
	}{
		"persegi":         {Rectangle{2, 2}, "persegi 2x2"},
		"persegi panjang": {Rectangle{2, 3}, "persegi panjang 2x3"},
		"lingkaran":       {Circle{1.5}, "lingkaran r=1.5"},
		"nil":             {nil, "nil"},
	}
	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			if got := Describe(tt.in); got != tt.want {
				t.Errorf("Describe = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestTypedNilGotcha(t *testing.T) {
	if FindBuggy(false) == nil {
		t.Fatal("kalau ini lolos, berarti gotcha-nya hilang; harusnya != nil")
	}
	if FindFixed(false) != nil {
		t.Fatal("FindFixed(false) harusnya nil")
	}
}
