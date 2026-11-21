<?php

declare(strict_types=1);

namespace Catsheet\Oop\Traits;

/**
 * Trait = copy-paste kode yang dibantu compiler (horizontal reuse).
 * Bukan tipe: `$x instanceof HasLogger` selalu false. Mirip default method di interface Java,
 * tapi trait boleh punya property dan state.
 */
trait HasLogger
{
    /** @var list<string> */
    private array $logs = [];

    public function log(string $message): void
    {
        $this->logs[] = sprintf('[%s] %s', $this->logPrefix(), $message);
    }

    /** @return list<string> */
    public function logs(): array
    {
        return $this->logs;
    }

    /** Trait bisa "memaksa" class pemakainya implement method tertentu. */
    abstract protected function logPrefix(): string;
}
