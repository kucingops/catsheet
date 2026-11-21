package dev.catsheet.quarkus.security;

import dev.catsheet.quarkus.config.CatsheetConfig;
import io.quarkus.security.AuthenticationFailedException;
import io.quarkus.security.identity.AuthenticationRequestContext;
import io.quarkus.security.identity.IdentityProvider;
import io.quarkus.security.identity.SecurityIdentity;
import io.quarkus.security.runtime.QuarkusPrincipal;
import io.quarkus.security.runtime.QuarkusSecurityIdentity;
import io.smallrye.mutiny.Uni;
import jakarta.enterprise.context.ApplicationScoped;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/** Verifikasi API key terhadap daftar client di config {@code catsheet.api-keys.*}. */
@ApplicationScoped
public class ApiKeyIdentityProvider implements IdentityProvider<ApiKeyAuthenticationRequest> {

    private final CatsheetConfig config;

    public ApiKeyIdentityProvider(CatsheetConfig config) {
        this.config = config;
    }

    @Override
    public Class<ApiKeyAuthenticationRequest> getRequestType() {
        return ApiKeyAuthenticationRequest.class;
    }

    @Override
    public Uni<SecurityIdentity> authenticate(ApiKeyAuthenticationRequest request, AuthenticationRequestContext context) {
        byte[] given = request.apiKey().getBytes(StandardCharsets.UTF_8);
        return config.apiKeys().entrySet().stream()
                // MessageDigest.isEqual = perbandingan constant-time, mencegah timing attack.
                .filter(e -> MessageDigest.isEqual(e.getValue().key().getBytes(StandardCharsets.UTF_8), given))
                .findFirst()
                .<Uni<SecurityIdentity>>map(e -> Uni.createFrom().item(QuarkusSecurityIdentity.builder()
                        .setPrincipal(new QuarkusPrincipal(e.getKey()))
                        .addRoles(e.getValue().roles())
                        .build()))
                .orElseGet(() -> Uni.createFrom().failure(new AuthenticationFailedException("API key tidak valid")));
    }
}
