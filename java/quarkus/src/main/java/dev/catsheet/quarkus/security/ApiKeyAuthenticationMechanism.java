package dev.catsheet.quarkus.security;

import io.quarkus.security.identity.IdentityProviderManager;
import io.quarkus.security.identity.SecurityIdentity;
import io.quarkus.security.identity.request.AuthenticationRequest;
import io.quarkus.vertx.http.runtime.security.ChallengeData;
import io.quarkus.vertx.http.runtime.security.HttpAuthenticationMechanism;
import io.quarkus.vertx.http.runtime.security.HttpCredentialTransport;
import io.smallrye.mutiny.Uni;
import io.vertx.ext.web.RoutingContext;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Set;

/**
 * Mekanisme login custom: header {@code X-API-Key}. Biasanya dipakai untuk komunikasi
 * mesin-ke-mesin (cron job, partner, bot).
 *
 * <p>Arsitektur security Quarkus (mirip Spring Security, beda nama):</p>
 * <pre>
 *  HttpAuthenticationMechanism  --(ambil credential dari HTTP)-->  AuthenticationRequest
 *  IdentityProvider             --(verifikasi credential)------->  SecurityIdentity (principal + roles)
 * </pre>
 * Di Spring: Filter -> Authentication (unauthenticated) -> AuthenticationProvider -> Authentication (authenticated).
 *
 * <p>Single Responsibility: class ini cuma tahu "credential ada di header mana",
 * verifikasinya di {@link ApiKeyIdentityProvider}.</p>
 */
@ApplicationScoped
public class ApiKeyAuthenticationMechanism implements HttpAuthenticationMechanism {

    public static final String HEADER = "X-API-Key";
    public static final String SCHEME = "apikey";

    @Override
    public Uni<SecurityIdentity> authenticate(RoutingContext context, IdentityProviderManager identityProviderManager) {
        String key = context.request().getHeader(HEADER);
        if (key == null || key.isBlank()) {
            // Bukan urusan mekanisme ini: kembalikan null supaya mekanisme lain boleh mencoba.
            return Uni.createFrom().nullItem();
        }
        return identityProviderManager.authenticate(new ApiKeyAuthenticationRequest(key));
    }

    @Override
    public Uni<ChallengeData> getChallenge(RoutingContext context) {
        return Uni.createFrom().item(new ChallengeData(401, null, null));
    }

    @Override
    public Set<Class<? extends AuthenticationRequest>> getCredentialTypes() {
        return Set.of(ApiKeyAuthenticationRequest.class);
    }

    /** Nama scheme ini yang dipakai di {@code quarkus.http.auth.permission.*.auth-mechanism=apikey}. */
    @Override
    public Uni<HttpCredentialTransport> getCredentialTransport(RoutingContext context) {
        return Uni.createFrom().item(new HttpCredentialTransport(HttpCredentialTransport.Type.OTHER_HEADER, HEADER, SCHEME));
    }
}
