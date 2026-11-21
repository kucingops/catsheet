package dev.catsheet.quarkus.security;

import dev.catsheet.quarkus.config.CatsheetConfig;
import io.quarkus.security.identity.IdentityProviderManager;
import io.quarkus.security.identity.SecurityIdentity;
import io.quarkus.security.identity.request.UsernamePasswordAuthenticationRequest;
import io.quarkus.security.credential.PasswordCredential;
import io.smallrye.jwt.build.Jwt;
import io.smallrye.mutiny.Uni;
import jakarta.annotation.security.PermitAll;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;

/**
 * Login endpoint untuk JWT: tukar username+password dengan access token.
 *
 * <p>Username/password dicek ke identity store yang SAMA dengan Basic dan Form
 * (user embedded di application.properties) lewat {@link IdentityProviderManager}.
 * Jadi satu sumber user, banyak cara login.</p>
 *
 * <p>Token ditandatangani private key RSA ({@code privateKey.pem}), diverifikasi pakai
 * public key ({@code publicKey.pem}). Server tidak menyimpan session: stateless.
 * Konsekuensinya token tidak bisa di-"logout" sebelum expired, makanya TTL dibuat pendek.</p>
 */
@Path("/api/auth/token")
public class TokenResource {

    public record LoginRequest(@NotBlank String username, @NotBlank String password) {
    }

    public record TokenResponse(String accessToken, String tokenType, long expiresIn) {
    }

    private final IdentityProviderManager identityProviderManager;
    private final CatsheetConfig config;

    public TokenResource(IdentityProviderManager identityProviderManager, CatsheetConfig config) {
        this.identityProviderManager = identityProviderManager;
        this.config = config;
    }

    @POST
    @PermitAll
    public Uni<TokenResponse> token(@Valid LoginRequest request) {
        var authRequest = new UsernamePasswordAuthenticationRequest(
                request.username(), new PasswordCredential(request.password().toCharArray()));
        // Password salah -> AuthenticationFailedException -> Quarkus balas 401.
        return identityProviderManager.authenticate(authRequest).map(this::issue);
    }

    private TokenResponse issue(SecurityIdentity identity) {
        var ttl = config.jwt().ttl();
        String token = Jwt.issuer(config.jwt().issuer())
                .upn(identity.getPrincipal().getName())
                .groups(identity.getRoles())
                .expiresIn(ttl)
                .sign();
        return new TokenResponse(token, "Bearer", ttl.toSeconds());
    }
}
