package cheat.springboot.oop;

/**
 * Pattern matching for switch (Java 21+): logic dipusatkan di satu tempat (data-oriented).
 * Alternatif OOP klasik: taruh method fee() di tiap subclass (polymorphism via override).
 * Trade-off: switch gampang nambah OPERASI baru, override gampang nambah TIPE baru.
 */
public class FeeCalculator {

    public Money feeFor(Payment payment) {
        return switch (payment) {
            case Payment.Card c when c.international() -> c.amount().percent(3);
            case Payment.Card c -> c.amount().percent(2);
            case Payment.BankTransfer t when t.bankCode().equals("BCA") -> Money.idr(0);
            case Payment.BankTransfer t -> Money.idr(6_500);
            case Payment.EWallet w -> w.amount().percent(1);
        };
    }
}
