package dev.catsheet.quarkus.api;

import io.quarkus.security.Authenticated;
import io.quarkus.security.identity.SecurityIdentity;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;

import java.util.Set;
import java.util.TreeSet;

/**
 * Satu endpoint, empat pintu login. Mekanisme mana yang boleh dipakai untuk tiap path
 * diatur di application.properties ({@code quarkus.http.auth.permission.*.auth-mechanism}).
 *
 * <pre>
 * /api/basic/whoami  -> HTTP Basic
 * /api/form/whoami   -> Form login (cookie terenkripsi)
 * /api/jwt/whoami    -> Bearer JWT
 * /api/key/whoami    -> header X-API-Key (mekanisme custom)
 * </pre>
 */
@Path("/api/{via: basic|form|jwt|key}/whoami")
public class WhoAmIResource {

    public record WhoAmI(String name, Set<String> roles, String via) {
    }

    private final SecurityIdentity identity;

    public WhoAmIResource(SecurityIdentity identity) {
        this.identity = identity;
    }

    @GET
    @Authenticated
    public WhoAmI whoami(@PathParam("via") String via) {
        return new WhoAmI(identity.getPrincipal().getName(), new TreeSet<>(identity.getRoles()), via);
    }
}
