<?php

declare(strict_types=1);

namespace Catsheet\Tests\Patterns;

use Catsheet\Oop\Abstraction\EWallet;
use Catsheet\Patterns\Builder\SqlBuilder;
use Catsheet\Patterns\Decorator\LoggingNotifier;
use Catsheet\Patterns\Decorator\RetryingNotifier;
use Catsheet\Patterns\Factory\PaymentMethodFactory;
use Catsheet\Patterns\Observer\EventDispatcher;
use Catsheet\Patterns\Observer\UserRegistered;
use Catsheet\Patterns\Strategy\RegularShipping;
use Catsheet\Patterns\Strategy\SameDayShipping;
use Catsheet\Patterns\Strategy\ShippingCalculator;
use Catsheet\Solid\Notifier;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;
use RuntimeException;

final class PatternsTest extends TestCase
{
    #[Test]
    public function strategy(): void
    {
        $calc = new ShippingCalculator(['reg' => new RegularShipping(), 'sameday' => new SameDayShipping()]);

        self::assertSame(9_000 + 2 * 2_000 + 1_000, $calc->quote('reg', 1_500, 10));
        self::assertSame(20_000 + 15_000, $calc->quote('sameday', 1_500, 10));
    }

    #[Test]
    public function factory(): void
    {
        self::assertInstanceOf(EWallet::class, PaymentMethodFactory::fromArray(['type' => 'ewallet', 'provider' => 'OVO']));
    }

    #[Test]
    public function decorator_retries_then_succeeds(): void
    {
        $inner = $this->createMock(Notifier::class);
        $inner->expects($this->exactly(3))
            ->method('send')
            ->willReturnOnConsecutiveCalls(
                $this->throwException(new RuntimeException('timeout')),
                $this->throwException(new RuntimeException('timeout')),
                null,
            );

        $logging = new LoggingNotifier(new RetryingNotifier($inner, maxAttempts: 3));
        $logging->send('x@y.z', 'hi');

        self::assertSame(['-> x@y.z', 'ok x@y.z'], $logging->lines);
    }

    #[Test]
    public function decorator_gives_up_after_max_attempts(): void
    {
        $inner = $this->createStub(Notifier::class);
        $inner->method('send')->willThrowException(new RuntimeException('down'));

        $this->expectExceptionMessage('down');
        new RetryingNotifier($inner, maxAttempts: 2)->send('x@y.z', 'hi');
    }

    #[Test]
    public function observer(): void
    {
        $sent = [];
        $dispatcher = new EventDispatcher();
        $dispatcher->listen(UserRegistered::class, function (UserRegistered $e) use (&$sent): void {
            $sent[] = "welcome {$e->email}";
        });
        $dispatcher->listen(UserRegistered::class, function (UserRegistered $e) use (&$sent): void {
            $sent[] = "audit {$e->email}";
        });

        $dispatcher->dispatch(new UserRegistered('budi@example.com'));

        self::assertSame(['welcome budi@example.com', 'audit budi@example.com'], $sent);
    }

    #[Test]
    public function immutable_builder(): void
    {
        $base = SqlBuilder::table('users')->select('id', 'email');
        $active = $base->where('active', '=', 1);
        $admins = $active->where('role', '=', 'admin')->limit(10);

        self::assertSame(['SELECT id, email FROM users', []], $base->toSql());
        self::assertSame(['SELECT id, email FROM users WHERE active = ?', [1]], $active->toSql());
        self::assertSame(
            ['SELECT id, email FROM users WHERE active = ? AND role = ? LIMIT 10', [1, 'admin']],
            $admins->toSql(),
        );
    }
}
