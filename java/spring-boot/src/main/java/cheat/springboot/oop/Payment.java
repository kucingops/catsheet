package cheat.springboot.oop;

/**
 * ABSTRACTION + POLYMORPHISM versi Java modern:
 * sealed interface membatasi siapa saja yang boleh implement -> compiler tahu semua subtype,
 * jadi switch pattern matching di {@link FeeCalculator} wajib exhaustive (tidak perlu default).
 */
public sealed interface Payment permits Payment.Card, Payment.BankTransfer, Payment.EWallet {

    Money amount();

    record Card(Money amount, String cardNumber, boolean international) implements Payment {}

    record BankTransfer(Money amount, String bankCode) implements Payment {}

    record EWallet(Money amount, String provider) implements Payment {}
}
