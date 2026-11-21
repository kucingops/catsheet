<?php

namespace App\Notes;

use InvalidArgumentException;

/**
 * Service layer: aturan bisnis ada di sini, bukan di controller atau model.
 * Cuma bergantung ke interface NoteRepository -> bisa di-unit-test murni pakai InMemoryNoteRepository.
 */
final readonly class NoteService
{
    public const int MAX_NOTES_PER_USER = 50;

    public function __construct(private NoteRepository $notes) {}

    public function create(int $userId, string $title, string $body): NoteData
    {
        if (count($this->notes->forUser($userId)) >= self::MAX_NOTES_PER_USER) {
            throw new InvalidArgumentException('Kuota catatan habis.');
        }

        return $this->notes->save(NoteData::draft($userId, $this->normalizeTitle($title), trim($body)));
    }

    public function update(NoteData $note, string $title, string $body): NoteData
    {
        return $this->notes->save($note->withChanges($this->normalizeTitle($title), trim($body)));
    }

    private function normalizeTitle(string $title): string
    {
        $title = preg_replace('/\s+/', ' ', trim($title));
        if ($title === '') {
            throw new InvalidArgumentException('Judul wajib diisi.');
        }

        return mb_strimwidth($title, 0, 120, '…');
    }
}
