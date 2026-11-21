package cheat.springboot.oop;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;

class MoneyTest {

    @Test
    void valueObjectEqualByValue() {
        assertThat(Money.idr(1000)).isEqualTo(new Money(new BigDecimal("1000.00"), "IDR"));
    }

    @Test
    void operationsReturnNewObject() {
        Money a = Money.idr(1000);
        Money b = a.plus(Money.idr(500));

        assertThat(a.amount()).isEqualByComparingTo("1000"); // a tidak berubah (immutable)
        assertThat(b.amount()).isEqualByComparingTo("1500");
    }

    @Test
    void rejectsInvalidState() {
        assertThatThrownBy(() -> Money.idr(-1)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> Money.idr(1).plus(new Money(BigDecimal.ONE, "USD")))
                .hasMessageContaining("currency beda");
    }
}
