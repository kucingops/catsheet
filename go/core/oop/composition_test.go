package oop

import "testing"

func TestEmbeddingIsNotInheritance(t *testing.T) {
	d := Dog{Animal: Animal{Name: "Bleki"}, Breed: "kampung"}

	if got := d.Sound(); got != "guk" {
		t.Errorf("d.Sound() = %q", got)
	}
	// Field & method Animal dipromosikan ke Dog.
	if d.Name != "Bleki" {
		t.Errorf("d.Name = %q", d.Name)
	}
	// Tapi Introduce tetap memanggil Animal.Sound, bukan Dog.Sound.
	want := "Aku Bleki, suaraku ..."
	if got := d.Introduce(); got != want {
		t.Errorf("d.Introduce() = %q, want %q", got, want)
	}
}

func TestPolymorphismViaInterface(t *testing.T) {
	d := Dog{Animal: Animal{Name: "Bleki"}}
	if got := Introduce(d.Name, d); got != "Aku Bleki, suaraku guk" {
		t.Errorf("Introduce = %q", got)
	}
	if got := Introduce("Bleki", LoudSounder{d}); got != "Aku Bleki, suaraku guk!!!" {
		t.Errorf("Introduce(Loud) = %q", got)
	}
}
