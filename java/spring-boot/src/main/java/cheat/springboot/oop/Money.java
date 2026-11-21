package cheat.springboot.oop;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Objects;

/**
 * Value object: immutable, dibandingkan berdasarkan nilai (bukan identitas).
 * Record otomatis bikin constructor, getter, equals/hashCode, toString.
 * Validasi ditaruh di compact constructor -> object tidak pernah dalam state invalid.
 */
public record Money(BigDecimal amount, String currency) {

    public Money {
        Objects.requireNonNull(amount, "amount wajib diisi");
        Objects.requireNonNull(currency, "currency wajib diisi");
        if (amount.signum() < 0) {
            throw new IllegalArgumentException("amount tidak boleh negatif");
        }
        amount = amount.setScale(2, RoundingMode.HALF_UP);
    }

    public static Money idr(long amount) {
        return new Money(BigDecimal.valueOf(amount), "IDR");
    }

    public Money plus(Money other) {
        requireSameCurrency(other);
        return new Money(amount.add(other.amount), currency); // object baru, yang lama tidak berubah
    }

    public Money minus(Money other) {
        requireSameCurrency(other);
        return new Money(amount.subtract(other.amount), currency);
    }

    public Money percent(int percent) {
        return new Money(amount.multiply(BigDecimal.valueOf(percent)).divide(BigDecimal.valueOf(100)), currency);
    }

    public boolean isLessThan(Money other) {
        requireSameCurrency(other);
        return amount.compareTo(other.amount) < 0;
    }

    private void requireSameCurrency(Money other) {
        if (!currency.equals(other.currency)) {
            throw new IllegalArgumentException("currency beda: " + currency + " vs " + other.currency);
        }
    }
}
