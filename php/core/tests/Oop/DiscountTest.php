<?php

declare(strict_types=1);

namespace Catsheet\Tests\Oop;

use Catsheet\Oop\Encapsulation\Money;
use Catsheet\Oop\Interfaces\Discount;
use Catsheet\Oop\Interfaces\FixedDiscount;
use Catsheet\Oop\Interfaces\NoDiscount;
use Catsheet\Oop\Interfaces\PercentageDiscount;
use Catsheet\Oop\Interfaces\StackedDiscount;
use InvalidArgumentException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\Attributes\TestWith;
use PHPUnit\Framework\TestCase;

final class DiscountTest extends TestCase
{
    /** @return iterable<string, array{Discount, int}> */
    public static function discounts(): iterable
    {
        yield 'tanpa diskon' => [new NoDiscount(), 100_000];
        yield '10 persen' => [new PercentageDiscount(10), 90_000];
        yield 'potongan 25rb' => [new FixedDiscount(Money::of(25_000)), 75_000];
        yield 'potongan lebih besar dari harga' => [new FixedDiscount(Money::of(150_000)), 0];
        yield '10% lalu 25rb' => [new StackedDiscount(new PercentageDiscount(10), new FixedDiscount(Money::of(25_000))), 65_000];
    }

    #[Test]
    #[DataProvider('discounts')]
    public function every_discount_honours_the_contract(Discount $discount, int $expected): void
    {
        self::assertSame($expected, $discount->apply(Money::of(100_000))->amount);
    }

    #[Test]
    #[TestWith([-1])]
    #[TestWith([101])]
    public function percentage_must_be_in_range(int $percent): void
    {
        $this->expectException(InvalidArgumentException::class);

        new PercentageDiscount($percent);
    }
}
