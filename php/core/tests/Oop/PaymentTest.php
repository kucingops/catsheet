<?php

declare(strict_types=1);

namespace Catsheet\Tests\Oop;

use Catsheet\Oop\Abstraction\BankTransfer;
use Catsheet\Oop\Abstraction\Checkout;
use Catsheet\Oop\Abstraction\CreditCard;
use Catsheet\Oop\Abstraction\EWallet;
use Catsheet\Oop\Abstraction\PaymentMethod;
use Catsheet\Oop\Encapsulation\Money;
use InvalidArgumentException;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

final class PaymentTest extends TestCase
{
    #[Test]
    public function each_method_computes_its_own_fee(): void
    {
        $amount = Money::of(200_000);

        self::assertSame(205_000, new CreditCard('4111111111111111')->pay($amount)->total->amount);
        self::assertSame(201_500, new EWallet('GoPay')->pay($amount)->total->amount);
        self::assertSame(200_000, new BankTransfer('BCA')->pay($amount)->total->amount);
    }

    #[Test]
    public function polymorphic_checkout_picks_cheapest(): void
    {
        $receipt = new Checkout()->cheapest(Money::of(50_000), [
            'card' => new CreditCard('4111111111111111'),
            'wallet' => new EWallet('OVO'),
        ]);

        self::assertSame('Credit Card **** 1111', $receipt->method); // 2.5% dari 50rb = 1.250 < 1.500
    }

    #[Test]
    public function template_method_validation_applies_to_all_subclasses(): void
    {
        $this->expectException(InvalidArgumentException::class);

        new BankTransfer('BRI')->pay(Money::zero());
    }

    #[Test]
    public function subclass_can_extend_validation(): void
    {
        $this->expectExceptionMessage('limit e-wallet');

        new EWallet('Dana')->pay(Money::of(10_000_001));
    }

    #[Test]
    public function anonymous_class_is_handy_for_one_off_subclass(): void
    {
        $free = new class extends PaymentMethod {
            public function name(): string
            {
                return 'Voucher';
            }

            protected function fee(Money $amount): Money
            {
                return Money::zero();
            }
        };

        self::assertSame('Voucher', $free->pay(Money::of(1))->method);
    }
}
