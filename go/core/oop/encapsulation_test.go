package oop

import (
	"errors"
	"testing"
)

// Table-driven test: pola test paling umum di Go. Satu fungsi test, banyak
// kasus di slice, tiap kasus jalan sebagai subtest lewat t.Run.
// Padanan di JUnit 5: @ParameterizedTest.
func TestNewBankAccount(t *testing.T) {
	tests := []struct {
		name    string
		owner   string
		initial int64
		wantErr bool
	}{
		{"valid", "hilmi", 100, false},
		{"saldo nol boleh", "hilmi", 0, false},
		{"owner kosong", "", 100, true},
		{"saldo negatif", "hilmi", -1, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			acc, err := NewBankAccount(tt.owner, tt.initial)
			if (err != nil) != tt.wantErr {
				t.Fatalf("err = %v, wantErr %v", err, tt.wantErr)
			}
			if err == nil && acc.Balance() != tt.initial {
				t.Errorf("Balance() = %d, want %d", acc.Balance(), tt.initial)
			}
		})
	}
}

func TestWithdraw(t *testing.T) {
	acc, _ := NewBankAccount("hilmi", 100)

	if err := acc.Withdraw(30); err != nil {
		t.Fatalf("Withdraw(30) error: %v", err)
	}
	if got := acc.Balance(); got != 70 {
		t.Errorf("Balance() = %d, want 70", got)
	}

	err := acc.Withdraw(1000)
	// errors.Is menembus wrapping %w. Jangan bandingkan err.Error() string.
	if !errors.Is(err, ErrInsufficientFunds) {
		t.Fatalf("err = %v, want ErrInsufficientFunds", err)
	}
	if got := acc.Balance(); got != 70 {
		t.Errorf("saldo berubah setelah gagal tarik: %d", got)
	}
}

func TestDepositRejectsNonPositive(t *testing.T) {
	acc, _ := NewBankAccount("hilmi", 0)
	for _, amount := range []int64{0, -5} {
		if err := acc.Deposit(amount); err == nil {
			t.Errorf("Deposit(%d) harusnya error", amount)
		}
	}
}
