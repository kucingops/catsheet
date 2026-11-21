<?php

namespace App\Notes;

use DateTimeImmutable;

/**
 * DTO / domain object yang TIDAK terikat ke Eloquent.
 * Repository mana pun (Eloquent, Query Builder, file JSON) mengembalikan tipe ini,
 * jadi controller & service tidak tahu data disimpan di mana.
 */
final readonly class NoteData
{
    public function __construct(
        public ?int $id,
        public int $userId,
        public string $title,
        public string $body,
        public ?DateTimeImmutable $createdAt = null,
    ) {}

    public static function draft(int $userId, string $title, string $body): self
    {
        return new self(null, $userId, $title, $body);
    }

    /**
     * `clone with` cuma boleh dari dalam class: property readonly itu implisit `protected(set)`,
     * jadi repository tidak bisa `clone($note, ['id' => 5])` dari luar. Sediakan method "wither".
     */
    public function withId(int $id): self
    {
        return clone ($this, ['id' => $id]);
    }

    public function withChanges(string $title, string $body): self
    {
        return clone ($this, ['title' => $title, 'body' => $body]);
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->userId,
            'title' => $this->title,
            'body' => $this->body,
            'created_at' => $this->createdAt?->format(DATE_ATOM),
        ];
    }
}
