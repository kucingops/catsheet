<?php

namespace Tests\Feature\Notes;

use App\Models\Note;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class NoteApiTest extends TestCase
{
    use RefreshDatabase;

    /** @return iterable<string, array{string}> */
    public static function drivers(): iterable
    {
        yield 'eloquent' => ['eloquent'];
        yield 'query builder' => ['query'];
        yield 'file json' => ['file'];
    }

    #[Test]
    #[DataProvider('drivers')]
    public function same_api_works_with_every_persistence_driver(string $driver): void
    {
        config(['catsheet.notes_driver' => $driver]); // container baca config saat resolve -> ganti implementasi
        Storage::fake('local');
        Sanctum::actingAs($user = User::factory()->create(), ['notes:read', 'notes:write']);

        $id = $this->postJson('/api/notes', ['title' => '  Catatan   pertama ', 'body' => 'isi'])
            ->assertCreated()
            ->assertJsonPath('title', 'Catatan pertama')
            ->json('id');

        $this->putJson("/api/notes/{$id}", ['title' => 'Diubah', 'body' => 'isi baru'])->assertOk();

        $this->getJson('/api/notes')
            ->assertOk()
            ->assertJsonPath('driver', $driver)
            ->assertJsonPath('data.0.title', 'Diubah')
            ->assertJsonPath('data.0.user_id', $user->id);

        $this->deleteJson("/api/notes/{$id}")->assertNoContent();
        $this->getJson("/api/notes/{$id}")->assertNotFound();
    }

    #[Test]
    public function token_without_write_ability_cannot_create(): void
    {
        Sanctum::actingAs(User::factory()->create(), ['notes:read']);

        $this->postJson('/api/notes', ['title' => 'x', 'body' => 'y'])->assertForbidden();
        $this->getJson('/api/notes')->assertOk();
    }

    #[Test]
    public function policy_blocks_access_to_other_users_note(): void
    {
        $note = Note::factory()->create();
        Sanctum::actingAs(User::factory()->create(), ['notes:read', 'notes:write']);

        $this->getJson("/api/notes/{$note->id}")->assertForbidden();
        $this->putJson("/api/notes/{$note->id}", ['title' => 'hack', 'body' => 'x'])->assertForbidden();
        $this->deleteJson("/api/notes/{$note->id}")->assertForbidden();
        $this->assertDatabaseHas('notes', ['id' => $note->id, 'title' => $note->title]);
    }

    #[Test]
    public function editor_can_view_but_not_edit_other_users_note(): void
    {
        $note = Note::factory()->create();
        Sanctum::actingAs(User::factory()->editor()->create(), ['notes:read', 'notes:write']);

        $this->getJson("/api/notes/{$note->id}")->assertOk(); // Policy::before
        $this->putJson("/api/notes/{$note->id}", ['title' => 'x', 'body' => 'y'])->assertForbidden();
    }

    #[Test]
    public function gate_protects_reports(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $this->getJson('/api/reports')->assertForbidden();

        Sanctum::actingAs(User::factory()->editor()->create());
        $this->getJson('/api/reports')->assertOk()->assertJsonStructure(['total_notes']);
    }

    #[Test]
    public function validation_errors_are_422(): void
    {
        Sanctum::actingAs(User::factory()->create(), ['notes:write']);

        $this->postJson('/api/notes', ['title' => ''])->assertUnprocessable()->assertJsonValidationErrors(['title', 'body']);
    }
}
