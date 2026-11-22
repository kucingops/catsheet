<?php

namespace App\Support;

use DateTimeImmutable;
use Psr\Clock\ClockInterface;

/** Clock PSR-20 yang ikut `$this->travel()` / Carbon::setTestNow() di test. */
final class LaravelClock implements ClockInterface
{
    public function now(): DateTimeImmutable
    {
        return now()->toDateTimeImmutable();
    }
}
