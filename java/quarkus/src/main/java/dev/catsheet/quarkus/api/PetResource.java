package dev.catsheet.quarkus.api;

import dev.catsheet.quarkus.domain.PetId;
import dev.catsheet.quarkus.service.AdoptionService;
import io.quarkus.security.identity.SecurityIdentity;
import jakarta.annotation.security.PermitAll;
import jakarta.annotation.security.RolesAllowed;
import jakarta.validation.Valid;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.core.Response;

import java.net.URI;
import java.time.Clock;
import java.util.List;

/**
 * Endpoint utama. Tidak peduli user login pakai mekanisme apa (Basic, Form, JWT, API key):
 * yang dicek cuma role-nya. Itu poin penting: <b>authentication</b> (siapa kamu) terpisah
 * dari <b>authorization</b> (boleh ngapain).
 */
@Path("/api/pets")
public class PetResource {

    private final AdoptionService service;
    private final SecurityIdentity identity;
    private final Clock clock;

    public PetResource(AdoptionService service, SecurityIdentity identity, Clock clock) {
        this.service = service;
        this.identity = identity;
        this.clock = clock;
    }

    @GET
    @PermitAll
    public List<PetResponse> available() {
        return service.available().stream().map(pet -> PetResponse.from(pet, clock)).toList();
    }

    @GET
    @Path("/{id}")
    @PermitAll
    public PetResponse get(@PathParam("id") String id) {
        return PetResponse.from(service.get(PetId.of(id)), clock);
    }

    @POST
    @RolesAllowed("admin")
    public Response register(@Valid RegisterPetRequest request) {
        var pet = service.register(request.toDomain());
        return Response.created(URI.create("/api/pets/" + pet.id()))
                .entity(PetResponse.from(pet, clock))
                .build();
    }

    @POST
    @Path("/{id}/adoption")
    @RolesAllowed({"user", "admin"})
    public AdoptionResponse adopt(@PathParam("id") String id) {
        // Nama adopter diambil dari identity yang sudah login, bukan dari body request.
        return AdoptionResponse.from(service.adopt(PetId.of(id), identity.getPrincipal().getName()));
    }
}
