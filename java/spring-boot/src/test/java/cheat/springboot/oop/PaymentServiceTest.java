package cheat.springboot.oop;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** Unit test murni: tanpa Spring context. Dependency di-mock, jadi cepat & terisolasi. */
@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    @Mock
    private Notifier notifier;

    private PaymentService service;

    @BeforeEach
    void setUp() {
        when(notifier.channel()).thenReturn("email");
        service = new PaymentService(List.of(notifier)); // constructor injection -> gampang di-test
    }

    @Test
    void chargesAmountPlusFeeAndNotifies() {
        BankAccount account = new BankAccount("1", Money.idr(200_000));

        Money total = service.pay(account, new Payment.EWallet(Money.idr(100_000), "OVO"), "email", "a@b.c");

        assertThat(total).isEqualTo(Money.idr(101_000));
        assertThat(account.balance()).isEqualTo(Money.idr(99_000));
        verify(notifier).send("a@b.c", "Pembayaran 101000.00 IDR berhasil");
    }

    @Test
    void doesNotNotifyWhenWithdrawFails() {
        BankAccount poor = new BankAccount("2", Money.idr(1_000));

        assertThatThrownBy(() -> service.pay(poor, new Payment.EWallet(Money.idr(100_000), "OVO"), "email", "a@b.c"))
                .isInstanceOf(BankAccount.InsufficientBalanceException.class);
        verify(notifier, never()).send(anyString(), anyString());
    }
}
