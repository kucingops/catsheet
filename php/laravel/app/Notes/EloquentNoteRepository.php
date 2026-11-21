<?php

namespace App\Notes;

use App\Models\Note;

/**
 * Versi ORM: paling ringkas, dapat timestamps, events, casting, relasi gratis.
 * Harga yang dibayar: hydrate object model (lebih berat) dan query tersembunyi (rawan N+1).
 */
final class EloquentNoteRepository implements NoteRepository
{
    public function find(int $id): ?NoteData
    {
        $model = Note::query()->find($id);

        return $model ? $this->toData($model) : null;
    }

    public function forUser(int $userId): array
    {
        return Note::query()
            ->where('user_id', $userId)
            ->orderBy('id')
            ->get()
            ->map($this->toData(...))
            ->values()
            ->all();
    }

    public function save(NoteData $note): NoteData
    {
        $model = $note->id === null ? new Note : Note::query()->findOrFail($note->id);
        $model->fill(['user_id' => $note->userId, 'title' => $note->title, 'body' => $note->body]);
        $model->save(); // INSERT atau UPDATE, Eloquent yang memutuskan dari $model->exists

        return $this->toData($model);
    }

    public function delete(int $id): void
    {
        Note::destroy($id); // destroy() load model dulu -> event `deleting/deleted` tetap jalan
    }

    private function toData(Note $model): NoteData
    {
        return new NoteData(
            id: $model->id,
            userId: $model->user_id,
            title: $model->title,
            body: $model->body,
            createdAt: $model->created_at?->toDateTimeImmutable(),
        );
    }
}
