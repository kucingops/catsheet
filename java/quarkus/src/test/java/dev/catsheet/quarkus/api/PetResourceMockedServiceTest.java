package dev.catsheet.quarkus.api;

import dev.catsheet.quarkus.domain.PetId;
import dev.catsheet.quarkus.domain.PetNotFoundException;
import dev.catsheet.quarkus.service.AdoptionService;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import java.util.List;

import static dev.catsheet.quarkus.support.TestPets.cat;
import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * {@code @InjectMock}: ganti bean CDI asli dengan mock Mockito, HANYA untuk class test ini.
 * Padanan {@code @MockitoBean} (dulu {@code @MockBean}) di Spring Boot.
 * Berguna untuk ngetes layer HTTP (status code, JSON) tanpa tergantung database.
 */
@QuarkusTest
class PetResourceMockedServiceTest {

    @InjectMock
    AdoptionService service;

    @Test
    void listIsSerializedFromServiceResult() {
        when(service.available()).thenReturn(List.of(cat("Oyen", 2)));

        given().get("/api/pets")
                .then().statusCode(200)
                .body("[0].name", equalTo("Oyen"))
                .body("[0].status", equalTo("AVAILABLE"));
    }

    @Test
    void domainExceptionIsMappedTo404() {
        when(service.get(any())).thenThrow(new PetNotFoundException(PetId.newId()));

        given().get("/api/pets/{id}", PetId.newId().toString())
                .then().statusCode(404)
                .body("error", equalTo("PetNotFoundException"));
    }
}
