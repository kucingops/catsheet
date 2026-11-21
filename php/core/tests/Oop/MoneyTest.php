<?php

declare(strict_types=1);

namespace Catsheet\Tests\Oop;

use Catsheet\Oop\Encapsulation\Money;
use Error;
use InvalidArgumentException;
use PHPUnit\Framework\Attributes\CoversClass;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

#[CoversClass(Money::class)]
final class MoneyTest extends TestCase
{
    #[Test]
    public function value_object_is_compared_by_value(): void
    {
        $a = Money::of(10_000);
        $b = Money::of(10_000);

        self::assertNotSame($a, $b);     // object beda (identitas)
        self::assertTrue($a->equals($b)); // tapi nilainya sama
        self::assertEquals($a, $b);       // assertEquals bandingkan property, assertSame bandingkan identitas
    }

    #[Test]
    public function operations_return_new_instance(): void
    {
        $price = Money::of(10_000);
        $total = $price->add(Money::of(2_500));

        self::assertSame(10_000, $price->amount, 'object asli tidak berubah (immutable)');
        self::assertSame(12_500, $total->amount);
    }

    #[Test]
    public function readonly_property_cannot_be_modified(): void
    {
        $money = Money::of(1);

        $this->expectException(Error::class);
        $this->expectExceptionMessage('Cannot modify readonly property');

        /** @phpstan-ignore-next-line sengaja */
        $money->amount = 99;
    }

    /** @return iterable<string, array{int, string}> */
    public static function invalidInputs(): iterable
    {
        yield 'negatif' => [-1, 'IDR'];
        yield 'currency kepanjangan' => [100, 'RUPIAH'];
    }

    #[Test]
    #[DataProvider('invalidInputs')]
    public function rejects_invalid_input(int $amount, string $currency): void
    {
        $this->expectException(InvalidArgumentException::class);

        Money::of($amount, $currency);
    }

    #[Test]
    public function cannot_mix_currency(): void
    {
        $this->expectExceptionMessage('Beda currency');

        Money::of(1, 'IDR')->add(Money::of(1, 'USD'));
    }

    #[Test]
    public function formats_nicely(): void
    {
        self::assertSame('IDR 1.500.000', (string) Money::of(1_500_000));
    }
}
