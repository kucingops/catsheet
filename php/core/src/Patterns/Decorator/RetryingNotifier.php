<?php

declare(strict_types=1);

namespace Catsheet\Patterns\Decorator;

use Catsheet\Solid\Notifier;
use RuntimeException;

/**
 * Decorator: bungkus object dengan interface yang sama untuk nambah perilaku
 * (retry, logging, caching) tanpa ubah class aslinya. Mirip middleware.
 */
final readonly class RetryingNotifier implements Notifier
{
    public function __construct(private Notifier $inner, private int $maxAttempts = 3)
    {
    }

    public function send(string $to, string $message): void
    {
        for ($attempt = 1; ; $attempt++) {
            try {
                $this->inner->send($to, $message);

                return;
            } catch (RuntimeException $e) {
                if ($attempt >= $this->maxAttempts) {
                    throw $e;
                }
            }
        }
    }
}
