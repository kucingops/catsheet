<?php

namespace Tests\Feature\Auth;

use App\Models\Admin;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/** Feature test: boot Laravel, kirim HTTP request palsu ke kernel (tanpa server beneran). */
final class SessionLoginTest extends TestCase
{
    use RefreshDatabase; // migrate sekali, tiap test dibungkus transaksi lalu di-rollback

    #[Test]
    public function user_logs_in_with_session_and_sees_dashboard(): void
    {
        $user = User::factory()->create(['email' => 'budi@example.com']);

        $this->postJson('/login', ['email' => 'budi@example.com', 'password' => 'password'])
            ->assertOk()
            ->assertJsonPath('guard', 'web');

        $this->assertAuthenticatedAs($user, 'web');
        $this->getJson('/dashboard')->assertOk()->assertJson(['guard' => 'web', 'id' => $user->id]);
    }

    #[Test]
    public function wrong_password_is_rejected(): void
    {
        User::factory()->create(['email' => 'budi@example.com']);

        $this->postJson('/login', ['email' => 'budi@example.com', 'password' => 'salah'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');

        $this->assertGuest('web');
    }

    #[Test]
    public function guest_is_redirected_to_the_right_login_page(): void
    {
        $this->get('/dashboard')->assertRedirect('/login');
        $this->get('/admin/dashboard')->assertRedirect('/admin/login');
        $this->getJson('/dashboard')->assertUnauthorized(); // request JSON -> 401, bukan redirect
    }

    #[Test]
    public function admin_guard_is_isolated_from_user_guard(): void
    {
        $admin = Admin::factory()->create(['email' => 'admin@example.com']);
        User::factory()->create(['email' => 'user@example.com']);

        // Kredensial user tidak bisa dipakai di login admin (tabel beda).
        $this->postJson('/admin/login', ['email' => 'user@example.com', 'password' => 'password'])->assertUnprocessable();

        $this->postJson('/admin/login', ['email' => 'admin@example.com', 'password' => 'password'])->assertOk();

        $this->assertAuthenticatedAs($admin, 'admin');
        $this->assertGuest('web');
        $this->getJson('/admin/dashboard')->assertOk()->assertJsonPath('guard', 'admin');
        $this->getJson('/dashboard')->assertUnauthorized();
    }

    #[Test]
    public function logout_ends_the_session(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'web')->postJson('/logout')->assertOk();

        $this->assertGuest('web');
    }

    #[Test]
    public function login_is_rate_limited(): void
    {
        foreach (range(1, 5) as $_) {
            $this->postJson('/login', ['email' => 'x@example.com', 'password' => 'salah']);
        }

        $this->postJson('/login', ['email' => 'x@example.com', 'password' => 'salah'])->assertTooManyRequests();
    }
}
