<?php

declare(strict_types=1);

namespace Catsheet\Oop\Magic;

use BadMethodCallException;
use Countable;
use OutOfBoundsException;
use Stringable;

/**
 * Magic method: hook yang dipanggil engine. Dipakai berat di Laravel
 * (Eloquent attribute pakai __get/__set, Facade pakai __callStatic).
 * Kekurangannya: IDE & static analysis susah nebak, jadi pakai seperlunya.
 */
final class Config implements Countable, Stringable
{
    /** @param array<string, mixed> $items */
    public function __construct(private array $items = [])
    {
    }

    public function __get(string $name): mixed
    {
        return $this->items[$name] ?? throw new OutOfBoundsException("Config '{$name}' tidak ada");
    }

    public function __set(string $name, mixed $value): void
    {
        $this->items[$name] = $value;
    }

    public function __isset(string $name): bool
    {
        return isset($this->items[$name]);
    }

    public function __unset(string $name): void
    {
        unset($this->items[$name]);
    }

    /** `$config->getDbHost()` -> items['db_host'] */
    public function __call(string $method, array $args): mixed
    {
        if (! str_starts_with($method, 'get')) {
            throw new BadMethodCallException("Method {$method} tidak ada");
        }
        $key = strtolower(preg_replace('/(?<!^)[A-Z]/', '_$0', substr($method, 3)));

        return $this->items[$key] ?? $args[0] ?? null;
    }

    public static function __callStatic(string $method, array $args): self
    {
        return match ($method) {
            'fromArray' => new self(...$args),
            default => throw new BadMethodCallException("Static method {$method} tidak ada"),
        };
    }

    /** Object bisa dipanggil seperti fungsi: `$config('key')`. */
    public function __invoke(string $key, mixed $default = null): mixed
    {
        return $this->items[$key] ?? $default;
    }

    public function __toString(): string
    {
        return json_encode($this->items, JSON_THROW_ON_ERROR);
    }

    public function count(): int
    {
        return count($this->items);
    }
}
