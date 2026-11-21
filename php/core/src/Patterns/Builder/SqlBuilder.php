<?php

declare(strict_types=1);

namespace Catsheet\Patterns\Builder;

/**
 * Builder + fluent interface yang IMMUTABLE: tiap method return clone baru,
 * jadi builder bisa di-reuse tanpa efek samping (beda dengan Query Builder Laravel yang mutable).
 *
 * `clone($this, [...])` = "clone with" (PHP 8.5): clone sambil ganti property readonly.
 */
final readonly class SqlBuilder
{
    /**
     * @param list<string> $wheres
     * @param list<mixed> $bindings
     */
    private function __construct(
        private string $table,
        private array $columns = ['*'],
        private array $wheres = [],
        private array $bindings = [],
        private ?int $limit = null,
    ) {
    }

    public static function table(string $table): self
    {
        return new self($table);
    }

    public function select(string ...$columns): self
    {
        return clone($this, ['columns' => array_values($columns)]);
    }

    public function where(string $column, string $operator, mixed $value): self
    {
        return clone($this, [
            'wheres' => [...$this->wheres, "{$column} {$operator} ?"],
            'bindings' => [...$this->bindings, $value],
        ]);
    }

    public function limit(int $limit): self
    {
        return clone($this, ['limit' => $limit]);
    }

    /** @return array{0: string, 1: list<mixed>} */
    public function toSql(): array
    {
        $sql = sprintf('SELECT %s FROM %s', implode(', ', $this->columns), $this->table);
        if ($this->wheres !== []) {
            $sql .= ' WHERE '.implode(' AND ', $this->wheres);
        }
        if ($this->limit !== null) {
            $sql .= " LIMIT {$this->limit}";
        }

        return [$sql, $this->bindings];
    }
}
