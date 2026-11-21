<?php

declare(strict_types=1);

namespace Catsheet\Tests\Patterns;

use Catsheet\Patterns\Container\Container;
use Catsheet\Solid\InvoiceMailer;
use Catsheet\Solid\Notifier;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;
use RuntimeException;

final class ContainerTest extends TestCase
{
    #[Test]
    public function autowires_constructor_dependencies(): void
    {
        $container = new Container();
        $container->singleton(Notifier::class, NullNotifier::class);

        $mailer = $container->make(InvoiceMailer::class); // InvoiceCalculator di-autowire tanpa binding

        self::assertSame(33_300, $mailer->send('a@b.c', [['price' => 30_000, 'qty' => 1]]));
        self::assertSame($container->make(Notifier::class), $container->make(Notifier::class));
    }

    #[Test]
    public function transient_binding_gives_new_instance(): void
    {
        $container = new Container();
        $container->bind(Notifier::class, fn (): Notifier => new NullNotifier());

        self::assertNotSame($container->make(Notifier::class), $container->make(Notifier::class));
    }

    #[Test]
    public function interface_without_binding_fails_loudly(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('tidak bisa di-instantiate');

        new Container()->make(InvoiceMailer::class);
    }

    #[Test]
    public function detects_circular_dependency(): void
    {
        $this->expectExceptionMessage('Circular dependency');

        new Container()->make(ChickenNeedsEgg::class);
    }
}

final class NullNotifier implements Notifier
{
    public function send(string $to, string $message): void
    {
    }
}

final class ChickenNeedsEgg
{
    public function __construct(public EggNeedsChicken $egg)
    {
    }
}

final class EggNeedsChicken
{
    public function __construct(public ChickenNeedsEgg $chicken)
    {
    }
}
