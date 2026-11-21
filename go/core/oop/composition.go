package oop

import "fmt"

// ---- Embedding: kelihatan seperti inheritance, tapi bukan ----

// Animal itu "base struct".
type Animal struct {
	Name string
}

func (a Animal) Sound() string { return "..." }

// Introduce memanggil a.Sound(). Perhatikan: receiver-nya Animal, jadi yang
// dipanggil SELALU Animal.Sound, walaupun Animal ini di-embed di Dog.
func (a Animal) Introduce() string {
	return fmt.Sprintf("Aku %s, suaraku %s", a.Name, a.Sound())
}

// Dog meng-embed Animal. Field & method Animal "dipromosikan", jadi
// dog.Name dan dog.Introduce() bisa dipanggil langsung.
// Secara teknis ini KOMPOSISI: Dog punya field bernama Animal.
type Dog struct {
	Animal
	Breed string
}

// Sound "meng-override" Animal.Sound... tapi cuma kalau dipanggil lewat Dog.
func (d Dog) Sound() string { return "guk" }

// Contoh:
//   d := Dog{Animal: Animal{Name: "Bleki"}}
//   d.Sound()      -> "guk"  (method Dog)
//   d.Introduce()  -> "Aku Bleki, suaraku ..."  <- BUKAN "guk"!
//
// Di Java, Introduce() akan memanggil Dog.sound() karena virtual dispatch.
// Di Go, nggak ada virtual dispatch di embedding. Ini pertanyaan interview
// favorit: "Apakah embedding = inheritance?" Jawabannya: bukan.
// Dog juga TIDAK bisa dipakai di tempat yang butuh Animal (nggak ada upcast).

// ---- Cara Go: polymorphism lewat interface, perilaku disuntik ----

// Sounder itu perilaku yang bisa diganti-ganti.
type Sounder interface {
	Sound() string
}

// Introduce versi benar: terima interface, jadi dispatch-nya dinamis.
// Ini pengganti "template method pattern" pakai abstract class di Java.
func Introduce(name string, s Sounder) string {
	return fmt.Sprintf("Aku %s, suaraku %s", name, s.Sound())
}

// ---- Embedding interface: decorator dengan sedikit kode ----

// LoudSounder membungkus Sounder lain. Karena meng-embed interface, semua
// method Sounder otomatis "diteruskan" ke Inner, dan kita cuma override yang
// perlu. Pola ini dipakai di folder gin: store.FileNoteRepository meng-embed
// MemoryNoteRepository lalu menambah perilaku "simpan ke file".
type LoudSounder struct {
	Sounder
}

func (l LoudSounder) Sound() string { return l.Sounder.Sound() + "!!!" }
