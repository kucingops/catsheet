package oop

import "testing"

func TestValueVsPointerReceiver(t *testing.T) {
	var c Counter
	c.IncValue()
	if c.Value() != 0 {
		t.Errorf("value receiver harusnya tidak mengubah aslinya, got %d", c.Value())
	}
	c.IncPointer() // Go otomatis ambil &c karena c addressable
	if c.Value() != 1 {
		t.Errorf("pointer receiver harusnya mengubah aslinya, got %d", c.Value())
	}

	var inc Incrementer = &c
	inc.IncPointer()
	if c.Value() != 2 {
		t.Errorf("lewat interface juga harus mengubah c, got %d", c.Value())
	}
}
