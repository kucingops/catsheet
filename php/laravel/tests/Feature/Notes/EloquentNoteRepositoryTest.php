<?php

namespace Tests\Feature\Notes;

use App\Notes\EloquentNoteRepository;
use App\Notes\NoteRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;

final class EloquentNoteRepositoryTest extends NoteRepositoryContract
{
    use RefreshDatabase;

    protected function makeRepository(): NoteRepository
    {
        return new EloquentNoteRepository;
    }
}
