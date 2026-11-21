<?php

namespace Tests\Feature\Notes;

use App\Notes\FileNoteRepository;
use App\Notes\NoteRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;

final class FileNoteRepositoryTest extends NoteRepositoryContract
{
    use RefreshDatabase; // cuma untuk bikin user di setUp; notes-nya sendiri ke file

    protected function makeRepository(): NoteRepository
    {
        // Storage::fake = disk sementara di storage/framework/testing, dibersihkan otomatis.
        return new FileNoteRepository(Storage::fake('local'));
    }
}
