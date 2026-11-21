<?php

namespace Tests\Feature\Auth;

use App\Auth\JwtService;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class TokenAuthTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp(); // wajib di Laravel TestCase: di sini app di-boot
        $this->user = User::factory()->create(['email' => 'budi@example.com']);
    }

    // ---------- Sanctum ----------

    #[Test]
    public function sanctum_issues_token_and_authenticates_with_it(): void
    {
        $token = $this->postJson('/api/sanctum/token', [
            'email' => 'budi@example.com', 'password' => 'password', 'device' => 'iphone',
        ])->assertCreated()->json('token');

        $this->withToken($token)->getJson('/api/sanctum/me')
            ->assertOk()
            ->assertJson(['guard' => 'sanctum', 'id' => $this->user->id]);

        $this->assertDatabaseCount('personal_access_tokens', 1);
        $this->assertDatabaseMissing('personal_access_tokens', ['token' => $token]); // yang disimpan hash, bukan plain
    }

    #[Test]
    public function sanctum_token_can_be_revoked(): void
    {
        $token = $this->user->createToken('cli')->plainTextToken;

        $this->withToken($token)->deleteJson('/api/sanctum/token')->assertNoContent();

        $this->assertDatabaseCount('personal_access_tokens', 0);
        $this->app['auth']->forgetGuards(); // reset cache guard antar request dalam satu test
        $this->withToken($token)->getJson('/api/sanctum/me')->assertUnauthorized();
    }

    #[Test]
    public function sanctum_acting_as_helper_skips_the_token_dance(): void
    {
        Sanctum::actingAs($this->user, ['notes:read']);

        $this->getJson('/api/sanctum/me')->assertOk();
    }

    // ---------- HTTP Basic ----------

    #[Test]
    public function basic_auth_is_stateless(): void
    {
        $this->withBasicAuth('budi@example.com', 'password')
            ->getJson('/api/basic/me')
            ->assertOk()
            ->assertJsonPath('id', $this->user->id);

        $this->withBasicAuth('budi@example.com', 'salah')->getJson('/api/basic/me')->assertUnauthorized();
    }

    // ---------- JWT ----------

    #[Test]
    public function jwt_login_and_access(): void
    {
        $token = $this->postJson('/api/jwt/token', ['email' => 'budi@example.com', 'password' => 'password'])
            ->assertOk()
            ->assertJsonPath('token_type', 'Bearer')
            ->json('access_token');

        $this->withToken($token)->getJson('/api/jwt/me')
            ->assertOk()
            ->assertJson(['guard' => 'jwt', 'id' => $this->user->id]);
    }

    #[Test]
    public function jwt_expires(): void
    {
        $token = $this->app->make(JwtService::class)->issue($this->user);

        $this->travel(2)->hours();

        $this->withToken($token)->getJson('/api/jwt/me')->assertUnauthorized();
    }

    #[Test]
    public function tampered_jwt_is_rejected(): void
    {
        $token = $this->app->make(JwtService::class)->issue($this->user);
        [$h, $p, $s] = explode('.', $token);
        $payload = json_decode(base64_decode(strtr($p, '-_', '+/')), true);
        $payload['sub'] = '999';
        $forged = $h.'.'.rtrim(strtr(base64_encode(json_encode($payload)), '+/', '-_'), '=').'.'.$s;

        $this->withToken($forged)->getJson('/api/jwt/me')->assertUnauthorized();
    }

    // ---------- API key partner ----------

    #[Test]
    public function partner_api_key(): void
    {
        $this->withHeader('X-Api-Key', 'rahasia-acme')->getJson('/api/partner/me')
            ->assertOk()
            ->assertJson(['guard' => 'partner', 'id' => 'partner:acme', 'name' => 'acme']);

        $this->app['auth']->forgetGuards();
        $this->withHeader('X-Api-Key', 'ngawur')->getJson('/api/partner/me')->assertUnauthorized();
    }

    // ---------- Multi guard ----------

    #[Test]
    public function one_route_accepts_sanctum_or_jwt(): void
    {
        $sanctum = $this->user->createToken('x')->plainTextToken;
        $jwt = $this->app->make(JwtService::class)->issue($this->user);

        $this->withToken($sanctum)->getJson('/api/me')->assertOk()->assertJsonPath('guard', 'sanctum');

        $this->app['auth']->forgetGuards();
        $this->withToken($jwt)->getJson('/api/me')->assertOk()->assertJsonPath('guard', 'jwt');

        $this->app['auth']->forgetGuards();
        $this->withToken('ngawur')->getJson('/api/me')->assertUnauthorized();
    }
}
