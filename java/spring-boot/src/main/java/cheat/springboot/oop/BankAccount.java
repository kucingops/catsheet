package cheat.springboot.oop;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * ENCAPSULATION: state (balance) private, cuma bisa diubah lewat method yang menjaga aturan bisnis
 * (invariant: saldo tidak boleh minus). Tidak ada setter publik.
 */
public class BankAccount {

    private final String number;
    private Money balance;
    private final List<String> history = new ArrayList<>();

    public BankAccount(String number, Money openingBalance) {
        this.number = number;
        this.balance = openingBalance;
    }

    public void deposit(Money money) {
        balance = balance.plus(money);
        history.add("DEPOSIT " + money.amount());
    }

    public void withdraw(Money money) {
        if (balance.isLessThan(money)) {
            throw new InsufficientBalanceException(number, balance, money);
        }
        balance = balance.minus(money);
        history.add("WITHDRAW " + money.amount());
    }

    public Money balance() {
        return balance;
    }

    /** Kembalikan view read-only, jangan bocorkan list internal. */
    public List<String> history() {
        return Collections.unmodifiableList(history);
    }

    public static class InsufficientBalanceException extends RuntimeException {
        public InsufficientBalanceException(String number, Money balance, Money requested) {
            super("Saldo rekening " + number + " kurang: " + balance.amount() + " < " + requested.amount());
        }
    }
}
