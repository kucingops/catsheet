package dev.catsheet.quarkus.domain;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

/** Unit test murni: tanpa Quarkus, tanpa mock. Jalan dalam milidetik. */
class MoneyTest {

    @ParameterizedTest(name = "{0} diskon {1}% = {2}")
    @CsvSource({
            "100000, 0,   100000",
            "100000, 50,  50000",
            "150001, 50,  75000",   // dibulatkan ke bawah
            "100000, 100, 0"
    })
    void discount(long amount, int percent, long expected) {
        assertThat(Money.rupiah(amount).discount(percent)).isEqualTo(Money.rupiah(expected));
    }

    @ParameterizedTest
    @ValueSource(ints = {-1, 101})
    void discountOutOfRangeIsRejected(int percent) {
        assertThatIllegalArgumentException().isThrownBy(() -> Money.rupiah(1).discount(percent));
    }

    @Test
    void negativeAmountIsRejectedByCompactConstructor() {
        assertThatIllegalArgumentException().isThrownBy(() -> Money.rupiah(-1));
    }

    @Test
    void recordsHaveValueEquality() {
        // Value object: dua object dengan isi sama dianggap sama.
        assertThat(Money.rupiah(5)).isEqualTo(new Money(5)).hasSameHashCodeAs(new Money(5));
    }

    @Test
    void isImmutable() {
        Money original = Money.rupiah(100);
        original.discount(50);
        assertThat(original.rupiah()).isEqualTo(100);
    }
}
