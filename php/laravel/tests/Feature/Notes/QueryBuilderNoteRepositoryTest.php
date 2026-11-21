<?php

namespace Tests\Feature\Notes;

use App\Notes\NoteRepository;
use App\Notes\QueryBuilderNoteRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;

final class QueryBuilderNoteRepositoryTest extends NoteRepositoryContract
{
    use RefreshDatabase;

    protected function makeRepository(): NoteRepository
    {
        return new QueryBuilderNoteRepository($this->app['db']->connection());
    }
}
