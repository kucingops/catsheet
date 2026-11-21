<?php

declare(strict_types=1);

namespace Catsheet\Tests\Solid;

use Catsheet\Solid\InvoiceCalculator;
use Catsheet\Solid\InvoiceMailer;
use Catsheet\Solid\Notifier;
use Catsheet\Solid\Rectangle;
use Catsheet\Solid\Shape;
use Catsheet\Solid\Square;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

/**
 * Tiga jenis test double di sini:
 * - Mock  : createMock + expects() -> verifikasi interaksi (dipanggil berapa kali, argumennya apa).
 * - Stub  : createStub -> cuma balikin nilai, tidak diverifikasi.
 * - Fake  : implementasi beneran yang ringan (InMemory), ditulis sendiri.
 */
final class InvoiceMailerTest extends TestCase
{
    private const array LINES = [['price' => 10_000, 'qty' => 2], ['price' => 5_000, 'qty' => 1]];

    #[Test]
    public function sends_total_using_a_mock(): void
    {
        $notifier = $this->createMock(Notifier::class);
        $notifier->expects($this->once())
            ->method('send')
            ->with('budi@example.com', 'Total tagihan: 27750');

        $total = new InvoiceMailer(new InvoiceCalculator(), $notifier)->send('budi@example.com', self::LINES);

        self::assertSame(27_750, $total);
    }

    #[Test]
    public function sends_total_using_a_hand_written_fake(): void
    {
        $fake = new class implements Notifier {
            /** @var list<array{string, string}> */
            public array $sent = [];

            public function send(string $to, string $message): void
            {
                $this->sent[] = [$to, $message];
            }
        };

        new InvoiceMailer(new InvoiceCalculator(), $fake)->send('a@b.c', self::LINES);

        self::assertSame([['a@b.c', 'Total tagihan: 27750']], $fake->sent);
    }

    #[Test]
    public function lsp_shapes_are_interchangeable(): void
    {
        $shapes = [new Rectangle(2, 3), new Square(3)];

        $total = array_sum(array_map(static fn (Shape $s): float => $s->area(), $shapes));

        self::assertSame(15.0, $total);
    }
}
