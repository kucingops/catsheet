<?php

namespace App\Notes;

/** Fake untuk unit test: tidak butuh Laravel, DB, atau file. */
final class InMemoryNoteRepository implements NoteRepository
{
    /** @var array<int, NoteData> */
    private array $notes = [];

    private int $sequence = 0;

    public function find(int $id): ?NoteData
    {
        return $this->notes[$id] ?? null;
    }

    public function forUser(int $userId): array
    {
        return array_values(array_filter($this->notes, fn (NoteData $n): bool => $n->userId === $userId));
    }

    public function save(NoteData $note): NoteData
    {
        $saved = $note->id === null ? $note->withId(++$this->sequence) : $note;

        return $this->notes[$saved->id] = $saved;
    }

    public function delete(int $id): void
    {
        unset($this->notes[$id]);
    }
}
