<?php

namespace App\Notes;

/**
 * Port (Hexagonal) / Repository interface. Implementasi dipilih di AppServiceProvider
 * berdasarkan config('catsheet.notes_driver').
 */
interface NoteRepository
{
    public function find(int $id): ?NoteData;

    /** @return list<NoteData> */
    public function forUser(int $userId): array;

    /** Insert kalau id null, update kalau tidak. Selalu return data dengan id terisi. */
    public function save(NoteData $note): NoteData;

    public function delete(int $id): void;
}
