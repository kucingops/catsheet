package dev.catsheet.quarkus.domain;

/**
 * Value object uang (Rupiah, tanpa sen biar simpel).
 *
 * <p>Immutable: setiap operasi mengembalikan object baru. Aman di-share antar thread
 * dan aman dipakai sebagai key di Map.</p>
 */
public record Money(long rupiah) implements Comparable<Money> {

    public static final Money ZERO = new Money(0);

    public Money {
        if (rupiah < 0) {
            throw new IllegalArgumentException("Nominal tidak boleh negatif: " + rupiah);
        }
    }

    public static Money rupiah(long amount) {
        return new Money(amount);
    }

    /** Diskon dalam persen, dibulatkan ke bawah. */
    public Money discount(int percent) {
        if (percent < 0 || percent > 100) {
            throw new IllegalArgumentException("Persen diskon harus 0..100: " + percent);
        }
        return new Money(rupiah * (100 - percent) / 100);
    }

    @Override
    public int compareTo(Money other) {
        return Long.compare(rupiah, other.rupiah);
    }
}
