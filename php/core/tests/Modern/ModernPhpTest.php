<?php

declare(strict_types=1);

namespace Catsheet\Tests\Modern;

use Catsheet\Modern\Customer;
use Catsheet\Modern\LazyLoading;
use Catsheet\Modern\Pipeline;
use PHPUnit\Framework\Attributes\RequiresPhp;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;
use ReflectionClass;

#[RequiresPhp('>=8.6.0')]
final class ModernPhpTest extends TestCase
{
    #[Test]
    public function pipe_operator(): void
    {
        self::assertSame('belajar-php-8-6', Pipeline::slug('  Belajar PHP 8.6!! '));
    }

    #[Test]
    public function partial_function_application(): void
    {
        self::assertSame(['INV-000007', 'INV-000123'], Pipeline::invoiceNumbers([7, 123]));
        self::assertSame([0, 55, 100], Pipeline::normalizedScores([-5, 55, 120]));
    }

    #[Test]
    public function array_first_last(): void
    {
        self::assertSame(['a', 'c'], Pipeline::firstAndLast(['a', 'b', 'c']));
        self::assertSame([null, null], Pipeline::firstAndLast([]));
    }

    #[Test]
    public function lazy_ghost_loads_on_first_access(): void
    {
        LazyLoading::$loads = 0;
        $customer = LazyLoading::customer(42);

        self::assertSame(0, LazyLoading::$loads, 'belum ada "query"');
        self::assertTrue(new ReflectionClass(Customer::class)->isUninitializedLazyObject($customer));

        self::assertSame('Customer #42', $customer->name);
        self::assertSame(1, LazyLoading::$loads);
        self::assertSame(42, $customer->id);
        self::assertSame(1, LazyLoading::$loads, 'cuma load sekali');
    }

    #[Test]
    public function no_discard_result_is_used(): void
    {
        self::assertSame(90, Pipeline::discounted(100, 10));
    }
}
