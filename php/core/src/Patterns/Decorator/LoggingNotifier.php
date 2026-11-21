<?php

declare(strict_types=1);

namespace Catsheet\Patterns\Decorator;

use Catsheet\Solid\Notifier;

final class LoggingNotifier implements Notifier
{
    /** @var list<string> */
    public private(set) array $lines = [];

    public function __construct(private readonly Notifier $inner)
    {
    }

    public function send(string $to, string $message): void
    {
        $this->lines[] = "-> {$to}";
        $this->inner->send($to, $message);
        $this->lines[] = "ok {$to}";
    }
}
