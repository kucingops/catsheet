<?php

declare(strict_types=1);

namespace Catsheet\Tests\Oop;

use Catsheet\Oop\Enums\HasLabel;
use Catsheet\Oop\Enums\Order;
use Catsheet\Oop\Enums\OrderStatus;
use Catsheet\Oop\Magic\Config;
use Catsheet\Oop\PropertyHooks\HasSku;
use Catsheet\Oop\PropertyHooks\Product;
use Catsheet\Oop\StaticBinding\Post;
use Catsheet\Oop\StaticBinding\User;
use Catsheet\Oop\Traits\Greeter;
use Catsheet\Oop\Traits\HasLogger;
use Error;
use InvalidArgumentException;
use LogicException;
use OutOfBoundsException;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;
use ValueError;

final class LanguageFeaturesTest extends TestCase
{
    #[Test]
    public function trait_conflict_resolution(): void
    {
        $greeter = new Greeter();

        self::assertSame('Halo Budi / Hello Budi', $greeter->greet('Budi'));
        self::assertSame(['[greeter] Halo Budi / Hello Budi'], $greeter->logs());
        self::assertContains(HasLogger::class, class_uses($greeter));
        // trait bukan tipe: tidak bisa dipakai buat instanceof / type hint. Cek pakai class_uses().
    }

    #[Test]
    public function enum_basics(): void
    {
        self::assertSame(OrderStatus::Paid, OrderStatus::from('paid'));
        self::assertNull(OrderStatus::tryFrom('unknown'));
        self::assertSame(OrderStatus::Pending, OrderStatus::from('pending')); // singleton: identik
        self::assertInstanceOf(HasLabel::class, OrderStatus::Paid);
        self::assertSame(['pending', 'paid', 'shipped', 'delivered', 'cancelled'], OrderStatus::values());

        $this->expectException(ValueError::class);
        OrderStatus::from('unknown');
    }

    #[Test]
    public function enum_as_state_machine(): void
    {
        $order = new Order();
        $order->moveTo(OrderStatus::Paid);
        $order->moveTo(OrderStatus::Shipped);

        self::assertSame('Dalam pengiriman', $order->status->label());

        $this->expectException(LogicException::class);
        $order->moveTo(OrderStatus::Cancelled);
    }

    #[Test]
    public function late_static_binding(): void
    {
        self::assertInstanceOf(User::class, User::make(['name' => 'a']));
        self::assertInstanceOf(Post::class, Post::makeWithSelf());
        self::assertSame('users', User::table());
        self::assertSame('posts', Post::table());
    }

    #[Test]
    public function magic_methods(): void
    {
        $config = Config::fromArray(['db_host' => 'localhost']);
        $config->debug = true;

        self::assertSame('localhost', $config->db_host);
        self::assertSame('localhost', $config->getDbHost());
        self::assertSame('fallback', $config->getMissing('fallback'));
        self::assertTrue(isset($config->debug));
        self::assertSame(5432, $config('db_port', 5432));
        self::assertCount(2, $config);
        self::assertSame('{"db_host":"localhost","debug":true}', (string) $config);

        $this->expectException(OutOfBoundsException::class);
        $config->nope;
    }

    #[Test]
    public function property_hooks(): void
    {
        $product = new Product('  abc-123 ', 100_000);

        self::assertSame('ABC-123', $product->sku);
        self::assertSame(111_000, $product->priceWithTax);
        self::assertInstanceOf(HasSku::class, $product);

        $this->expectException(InvalidArgumentException::class);
        $product->price = -1;
    }

    #[Test]
    public function virtual_property_is_read_only(): void
    {
        $product = new Product('ABC-123', 1);

        $this->expectException(Error::class);
        $product->priceWithTax = 5;
    }
}
