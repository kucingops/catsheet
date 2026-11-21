<?php

namespace Tests\Feature\Notes;

use App\Models\User;
use App\Notes\NoteData;
use App\Notes\NoteRepository;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Contract test: SATU set test, dijalankan untuk SEMUA implementasi NoteRepository.
 * Subclass cuma perlu kasih tahu cara bikin repository-nya (Template Method di level test).
 * Ini cara membuktikan Liskov Substitution: implementasi mana pun perilakunya sama.
 */
abstract class NoteRepositoryContract extends TestCase
{
    abstract protected function makeRepository(): NoteRepository;

    protected int $userId;

    protected int $otherUserId;

    protected function setUp(): void
    {
        parent::setUp();
        // Butuh user beneran karena tabel notes punya foreign key (driver file sebenarnya tidak peduli).
        [$this->userId, $this->otherUserId] = User::factory()->count(2)->create()->pluck('id')->all();
    }

    #[Test]
    public function save_assigns_an_id_and_find_returns_it(): void
    {
        $repo = $this->makeRepository();

        $saved = $repo->save(NoteData::draft($this->userId, 'Judul', 'Isi'));

        self::assertNotNull($saved->id);
        self::assertNotNull($saved->createdAt);
        self::assertEquals(
            [$saved->id, $this->userId, 'Judul', 'Isi'],
            [$repo->find($saved->id)->id, $repo->find($saved->id)->userId, $repo->find($saved->id)->title, $repo->find($saved->id)->body],
        );
    }

    #[Test]
    public function find_returns_null_when_missing(): void
    {
        self::assertNull($this->makeRepository()->find(999_999));
    }

    #[Test]
    public function save_with_id_updates_instead_of_inserting(): void
    {
        $repo = $this->makeRepository();
        $note = $repo->save(NoteData::draft($this->userId, 'v1', 'a'));

        $repo->save($note->withChanges('v2', 'b'));

        self::assertCount(1, $repo->forUser($this->userId));
        self::assertSame('v2', $repo->find($note->id)->title);
    }

    #[Test]
    public function for_user_only_returns_own_notes_in_insert_order(): void
    {
        $repo = $this->makeRepository();
        $repo->save(NoteData::draft($this->userId, 'satu', 'x'));
        $repo->save(NoteData::draft($this->otherUserId, 'punya orang', 'x'));
        $repo->save(NoteData::draft($this->userId, 'dua', 'x'));

        $titles = array_map(fn (NoteData $n) => $n->title, $repo->forUser($this->userId));

        self::assertSame(['satu', 'dua'], $titles);
    }

    #[Test]
    public function delete_removes_the_note(): void
    {
        $repo = $this->makeRepository();
        $note = $repo->save(NoteData::draft($this->userId, 'hapus aku', 'x'));

        $repo->delete($note->id);

        self::assertNull($repo->find($note->id));
    }
}
