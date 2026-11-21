package oop

import (
	"errors"
	"fmt"
)

// ErrInsufficientFunds itu "sentinel error": nilai error yang bisa dicek
// pakai errors.Is. Ini pengganti custom checked exception di Java.
var ErrInsufficientFunds = errors.New("saldo tidak cukup")

// BankAccount contoh encapsulation.
//
// Field huruf kecil (owner, balance) = unexported = cuma bisa diakses dari
// package oop. Dari package lain, satu-satunya cara ubah saldo adalah lewat
// method Deposit/Withdraw, jadi invariant "saldo >= 0" selalu terjaga.
//
// Catatan: visibility Go itu level PACKAGE, bukan level type. File lain di
// package yang sama tetap bisa baca a.balance. Nggak ada padanan "private"
// per-class seperti di Java.
type BankAccount struct {
	owner   string
	balance int64 // simpan dalam satuan terkecil (sen/rupiah), jangan float
}

// NewBankAccount itu "constructor". Go nggak punya constructor bawaan,
// konvensinya fungsi NewXxx yang mengembalikan nilai yang sudah valid.
func NewBankAccount(owner string, initial int64) (*BankAccount, error) {
	if owner == "" {
		return nil, errors.New("owner wajib diisi")
	}
	if initial < 0 {
		return nil, fmt.Errorf("saldo awal tidak boleh negatif: %d", initial)
	}
	return &BankAccount{owner: owner, balance: initial}, nil
}

// Owner dan Balance itu getter. Konvensi Go: namanya Owner(), bukan GetOwner().
func (a *BankAccount) Owner() string  { return a.owner }
func (a *BankAccount) Balance() int64 { return a.balance }

// Deposit pakai pointer receiver (*BankAccount) karena mengubah state.
// Kalau pakai value receiver, yang diubah cuma salinannya.
func (a *BankAccount) Deposit(amount int64) error {
	if amount <= 0 {
		return fmt.Errorf("jumlah deposit harus positif: %d", amount)
	}
	a.balance += amount
	return nil
}

func (a *BankAccount) Withdraw(amount int64) error {
	if amount <= 0 {
		return fmt.Errorf("jumlah tarik harus positif: %d", amount)
	}
	if amount > a.balance {
		// %w membungkus error, jadi caller tetap bisa errors.Is(err, ErrInsufficientFunds)
		// sambil dapat pesan yang lebih jelas. Mirip "cause" di exception Java.
		return fmt.Errorf("tarik %d dari saldo %d: %w", amount, a.balance, ErrInsufficientFunds)
	}
	a.balance -= amount
	return nil
}
