package cheat.springboot.oop;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.stream.Stream;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

class FeeCalculatorTest {

    private final FeeCalculator calculator = new FeeCalculator();

    static Stream<Arguments> payments() {
        Money amount = Money.idr(100_000);
        return Stream.of(
                Arguments.of(new Payment.Card(amount, "4111", false), Money.idr(2_000)),
                Arguments.of(new Payment.Card(amount, "4111", true), Money.idr(3_000)),
                Arguments.of(new Payment.BankTransfer(amount, "BCA"), Money.idr(0)),
                Arguments.of(new Payment.BankTransfer(amount, "BRI"), Money.idr(6_500)),
                Arguments.of(new Payment.EWallet(amount, "GoPay"), Money.idr(1_000)));
    }

    @ParameterizedTest(name = "{0} -> fee {1}")
    @MethodSource("payments")
    void feeDependsOnPaymentType(Payment payment, Money expectedFee) {
        assertThat(calculator.feeFor(payment)).isEqualTo(expectedFee);
    }
}
