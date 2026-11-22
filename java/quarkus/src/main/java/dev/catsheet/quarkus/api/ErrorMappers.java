package dev.catsheet.quarkus.api;

import dev.catsheet.quarkus.domain.DomainException;
import dev.catsheet.quarkus.domain.PetAlreadyAdoptedException;
import dev.catsheet.quarkus.domain.PetNotFoundException;
import jakarta.ws.rs.core.Response;
import org.jboss.resteasy.reactive.server.ServerExceptionMapper;

/** Terjemahan exception domain ke HTTP status. Padanan {@code @ControllerAdvice} di Spring. */
public class ErrorMappers {

    public record ErrorBody(String error, String message) {
    }

    @ServerExceptionMapper
    public Response domain(DomainException e) {
        int status = switch (e) {
            case PetNotFoundException _ -> 404;
            case PetAlreadyAdoptedException _ -> 409;
        };
        return Response.status(status).entity(new ErrorBody(e.getClass().getSimpleName(), e.getMessage())).build();
    }

    @ServerExceptionMapper
    public Response badInput(IllegalArgumentException e) {
        return Response.status(400).entity(new ErrorBody("BadRequest", e.getMessage())).build();
    }
}
