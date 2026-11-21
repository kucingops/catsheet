<?php

namespace Tests\Feature\Notes;

use App\Models\Note;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\LazyLoadingViolationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Test;
use RuntimeException;
use Tests\TestCase;

/** Hal yang sering ditanya interview soal ORM, dibuktikan pakai test. */
final class EloquentPitfallsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Note::factory()->count(5)->create(); // 5 note, masing-masing user beda
    }

    private function countQueries(callable $callback): int
    {
        DB::flushQueryLog();
        DB::enableQueryLog();
        $callback();

        return count(DB::getQueryLog());
    }

    #[Test]
    public function lazy_loading_relation_in_a_loop_causes_n_plus_1(): void
    {
        $queries = $this->countQueries(function () {
            foreach (Note::all() as $note) {
                $note->user->name; // tiap iterasi 1 query
            }
        });

        self::assertSame(1 + 5, $queries);
    }

    #[Test]
    public function eager_loading_fixes_it(): void
    {
        $queries = $this->countQueries(function () {
            foreach (Note::with('user')->get() as $note) {
                $note->user->name;
            }
        });

        self::assertSame(2, $queries); // select notes + select users where id in (...)
    }

    #[Test]
    public function prevent_lazy_loading_makes_n_plus_1_fail_fast(): void
    {
        // Biasanya dipasang di AppServiceProvider::boot(): Model::preventLazyLoading(! app()->isProduction());
        Model::preventLazyLoading();

        try {
            $this->expectException(LazyLoadingViolationException::class);
            Note::all()->each(fn (Note $n) => $n->user);
        } finally {
            Model::preventLazyLoading(false);
        }
    }

    #[Test]
    public function transaction_rolls_back_everything_on_exception(): void
    {
        $user = User::factory()->create();

        try {
            DB::transaction(function () use ($user) {
                $user->notes()->create(['title' => 'a', 'body' => 'x']);
                $user->notes()->create(['title' => 'b', 'body' => 'x']);
                throw new RuntimeException('gagal di tengah jalan');
            });
        } catch (RuntimeException) {
        }

        self::assertSame(0, $user->notes()->count());
    }

    #[Test]
    public function mass_assignment_only_allows_fillable(): void
    {
        $user = User::factory()->create();

        // `id` tidak ada di #[Fillable], jadi diabaikan (atau exception kalau Model::preventSilentlyDiscardingAttributes()).
        $note = Note::create(['id' => 999, 'user_id' => $user->id, 'title' => 't', 'body' => 'b']);

        self::assertNotSame(999, $note->id);
    }
}
