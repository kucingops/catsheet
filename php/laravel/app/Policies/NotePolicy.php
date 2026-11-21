<?php

namespace App\Policies;

use App\Models\User;
use App\Notes\NoteData;

/**
 * Policy tidak harus untuk Eloquent model. Di sini dipasang ke DTO NoteData,
 * jadi tetap jalan walaupun NOTES_DRIVER=file.
 */
class NotePolicy
{
    /** Dipanggil sebelum method lain. Return null = lanjut cek method spesifik. */
    public function before(User $user, string $ability): ?bool
    {
        return $user->isEditor() && $ability === 'view' ? true : null;
    }

    public function view(User $user, NoteData $note): bool
    {
        return $note->userId === $user->id;
    }

    public function update(User $user, NoteData $note): bool
    {
        return $note->userId === $user->id;
    }

    public function delete(User $user, NoteData $note): bool
    {
        return $note->userId === $user->id;
    }
}
