package cheat.springboot.oop;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

class BankAccountTest {

    private BankAccount account;

    @BeforeEach
    void setUp() { // jalan sebelum tiap test -> tiap test dapat object baru (test saling independen)
        account = new BankAccount("123", Money.idr(100_000));
    }

    @Nested
    @DisplayName("withdraw")
    class Withdraw {

        @Test
        void reducesBalance() {
            account.withdraw(Money.idr(30_000));
            assertThat(account.balance()).isEqualTo(Money.idr(70_000));
        }

        @Test
        void keepsInvariantWhenBalanceInsufficient() {
            assertThatThrownBy(() -> account.withdraw(Money.idr(200_000)))
                    .isInstanceOf(BankAccount.InsufficientBalanceException.class);
            assertThat(account.balance()).isEqualTo(Money.idr(100_000)); // state tidak rusak
        }
    }

    @Test
    void historyIsReadOnly() {
        account.deposit(Money.idr(1));
        assertThatThrownBy(() -> account.history().clear()).isInstanceOf(UnsupportedOperationException.class);
    }
}
