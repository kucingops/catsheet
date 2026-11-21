<?php

namespace Tests\Unit;

use App\Notes\InMemoryNoteRepository;
use App\Notes\NoteData;
use App\Notes\NoteRepository;
use App\Notes\NoteService;
use InvalidArgumentException;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase; // PHPUnit murni: TIDAK boot Laravel -> cepat (ms)

/**
 * Unit test sejati: tidak ada framework, DB, atau HTTP.
 * Bisa begini karena NoteService cuma bergantung ke interface (DIP).
 */
final class NoteServiceTest extends TestCase
{
    private InMemoryNoteRepository $repo;

    private NoteService $service;

    protected function setUp(): void
    {
        $this->repo = new InMemoryNoteRepository;
        $this->service = new NoteService($this->repo);
    }

    #[Test]
    public function it_normalizes_title_and_body(): void
    {
        $note = $this->service->create(1, "  Belajar   \n Laravel ", '  isi  ');

        self::assertSame('Belajar Laravel', $note->title);
        self::assertSame('isi', $note->body);
        self::assertSame(1, $note->id);
    }

    #[Test]
    public function it_rejects_empty_title(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $this->service->create(1, '   ', 'x');
    }

    #[Test]
    public function it_enforces_quota_per_user(): void
    {
        for ($i = 0; $i < NoteService::MAX_NOTES_PER_USER; $i++) {
            $this->service->create(1, "n{$i}", 'x');
        }
        $this->service->create(2, 'user lain tidak kena', 'x');

        $this->expectExceptionMessage('Kuota');
        $this->service->create(1, 'satu lagi', 'x');
    }

    #[Test]
    public function update_keeps_identity_and_owner(): void
    {
        $note = $this->service->create(7, 'lama', 'a');

        $updated = $this->service->update($note, 'baru', 'b');

        self::assertSame([$note->id, 7, 'baru'], [$updated->id, $updated->userId, $updated->title]);
        self::assertSame('lama', $note->title, 'NoteData immutable');
    }

    #[Test]
    public function with_a_mock_we_verify_the_interaction_instead(): void
    {
        $repo = $this->createMock(NoteRepository::class);
        $repo->method('forUser')->willReturn([]);
        $repo->expects($this->once())
            ->method('save')
            ->with($this->callback(fn (NoteData $n) => $n->id === null && $n->title === 'Halo'))
            ->willReturnArgument(0);

        new NoteService($repo)->create(1, 'Halo', 'x');
    }
}
