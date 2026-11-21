<?php

declare(strict_types=1);

namespace Catsheet\Tests\Oop;

use Catsheet\Oop\Encapsulation\BankAccount;
use Catsheet\Oop\Encapsulation\InsufficientFunds;
use Catsheet\Oop\Encapsulation\Money;
use Error;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

final class BankAccountTest extends TestCase
{
    private BankAccount $account;

    /** Dipanggil sebelum TIAP test (mirip @BeforeEach JUnit). Tiap test dapat object baru. */
    protected function setUp(): void
    {
        $this->account = new BankAccount('123');
        $this->account->deposit(Money::of(100_000));
    }

    #[Test]
    public function balance_is_readable_from_outside(): void
    {
        self::assertSame(100_000, $this->account->balance->amount);
    }

    #[Test]
    public function balance_is_not_writable_from_outside(): void
    {
        $this->expectException(Error::class);
        $this->expectExceptionMessageMatches('/Cannot modify private\(set\) property/');

        $this->account->balance = Money::of(1_000_000_000);
    }

    #[Test]
    public function withdraw_keeps_invariant(): void
    {
        $this->expectException(InsufficientFunds::class);

        $this->account->withdraw(Money::of(100_001));
    }

    #[Test]
    public function history_is_a_copy(): void
    {
        $history = $this->account->history();
        $history[] = 'hack';

        self::assertCount(1, $this->account->history());
    }
}
