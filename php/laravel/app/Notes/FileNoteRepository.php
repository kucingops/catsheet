<?php

namespace App\Notes;

use DateTimeImmutable;
use Illuminate\Contracts\Filesystem\Filesystem;

/**
 * Versi TANPA database: simpan ke satu file JSON lewat Filesystem (local/S3 sama saja).
 * Bagus buat prototipe/demo, tapi tidak ada transaksi, index, atau locking antar proses.
 */
final class FileNoteRepository implements NoteRepository
{
    public function __construct(
        private readonly Filesystem $disk,
        private readonly string $path = 'notes.json',
    ) {}

    public function find(int $id): ?NoteData
    {
        $row = $this->read()['notes'][$id] ?? null;

        return $row ? $this->toData($row) : null;
    }

    public function forUser(int $userId): array
    {
        $rows = array_filter($this->read()['notes'], fn (array $r): bool => $r['user_id'] === $userId);
        ksort($rows);

        return array_values(array_map($this->toData(...), $rows));
    }

    public function save(NoteData $note): NoteData
    {
        $data = $this->read();
        $id = $note->id ?? ++$data['sequence'];
        $data['notes'][$id] = [
            'id' => $id,
            'user_id' => $note->userId,
            'title' => $note->title,
            'body' => $note->body,
            'created_at' => $data['notes'][$id]['created_at'] ?? now()->toAtomString(),
        ];
        $this->write($data);

        return $this->toData($data['notes'][$id]);
    }

    public function delete(int $id): void
    {
        $data = $this->read();
        unset($data['notes'][$id]);
        $this->write($data);
    }

    /** @return array{sequence: int, notes: array<int, array<string, mixed>>} */
    private function read(): array
    {
        if (! $this->disk->exists($this->path)) {
            return ['sequence' => 0, 'notes' => []];
        }

        $data = json_decode($this->disk->get($this->path), true, flags: JSON_THROW_ON_ERROR);
        // JSON object key selalu string; kembalikan ke int supaya lookup by id konsisten.
        $data['notes'] = array_combine(array_map(intval(...), array_keys($data['notes'])), $data['notes']) ?: [];

        return $data;
    }

    private function write(array $data): void
    {
        $this->disk->put($this->path, json_encode($data, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR));
    }

    private function toData(array $row): NoteData
    {
        return new NoteData($row['id'], $row['user_id'], $row['title'], $row['body'], new DateTimeImmutable($row['created_at']));
    }
}
