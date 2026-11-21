<?php

namespace App\Notes;

use DateTimeImmutable;
use Illuminate\Database\ConnectionInterface;

/**
 * Versi tanpa ORM: Query Builder + raw SQL. Setara JdbcTemplate di Spring.
 * Hasilnya stdClass, jadi mapping, timestamps, dan validasi relasi kita urus sendiri.
 * Cocok untuk report/batch yang butuh kontrol SQL penuh.
 *
 * Connection di-inject (bukan facade DB::) supaya dependency-nya kelihatan dan gampang di-test.
 */
final readonly class QueryBuilderNoteRepository implements NoteRepository
{
    public function __construct(private ConnectionInterface $db) {}

    public function find(int $id): ?NoteData
    {
        // Raw SQL dengan binding `?` -> prepared statement, aman dari SQL injection.
        $row = $this->db->selectOne('select * from notes where id = ?', [$id]);

        return $row ? $this->toData($row) : null;
    }

    public function forUser(int $userId): array
    {
        return $this->db->table('notes')
            ->where('user_id', $userId)
            ->orderBy('id')
            ->get()
            ->map($this->toData(...))
            ->values()
            ->all();
    }

    public function save(NoteData $note): NoteData
    {
        $now = now()->toDateTimeString();
        $values = ['user_id' => $note->userId, 'title' => $note->title, 'body' => $note->body, 'updated_at' => $now];

        if ($note->id === null) {
            $id = $this->db->table('notes')->insertGetId($values + ['created_at' => $now]);
        } else {
            $this->db->table('notes')->where('id', $note->id)->update($values);
            $id = $note->id;
        }

        return $this->find($id);
    }

    public function delete(int $id): void
    {
        $this->db->delete('delete from notes where id = ?', [$id]);
    }

    private function toData(object $row): NoteData
    {
        return new NoteData(
            id: (int) $row->id,
            userId: (int) $row->user_id,
            title: $row->title,
            body: $row->body,
            createdAt: $row->created_at ? new DateTimeImmutable($row->created_at) : null,
        );
    }
}
