package dev.catsheet.quarkus.api;

import dev.catsheet.quarkus.repository.jpa.PetEntityDao;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static dev.catsheet.quarkus.support.TestPets.catJson;
import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;

/**
 * Integration test HTTP penuh (JAX-RS -> service -> JPA -> H2).
 *
 * <p>{@code @TestSecurity} = "pura-pura sudah login" dengan user/role tertentu. Fokusnya
 * menguji <b>authorization</b> (role), tanpa repot login sungguhan. Login sungguhan dites di
 * {@code security.LoginMechanismsTest}.</p>
 */
@QuarkusTest
class PetResourceTest {

    @Inject
    PetEntityDao dao;

    @BeforeEach
    void cleanDb() {
        QuarkusTransaction.requiringNew().run(dao::deleteAll);
    }

    @Test
    void anonymousCanBrowseButCannotRegister() {
        given().get("/api/pets").then().statusCode(200).body("$", hasSize(0));

        given().contentType(ContentType.JSON).body(catJson("Oyen"))
                .post("/api/pets")
                .then().statusCode(401);
    }

    @Test
    @TestSecurity(user = "bob", roles = "user")
    void userWithoutAdminRoleIsForbidden() {
        given().contentType(ContentType.JSON).body(catJson("Oyen"))
                .post("/api/pets")
                .then().statusCode(403); // 401 = belum login, 403 = sudah login tapi tidak berhak
    }

    @Test
    @TestSecurity(user = "alice", roles = {"admin", "user"})
    void fullAdoptionFlow() {
        String id = given().contentType(ContentType.JSON).body(catJson("Oyen"))
                .post("/api/pets")
                .then().statusCode(201)
                .body("species", equalTo("CAT"))
                .body("summary", equalTo("Kucing rumahan, bilang meong"))
                .extract().path("id");

        given().post("/api/pets/{id}/adoption", id)
                .then().statusCode(200)
                .body("adopter", equalTo("alice"))
                .body("feeRupiah", equalTo(150_000))
                .body("adoptedOn", notNullValue());

        // Adopsi kedua -> 409 Conflict (dari PetAlreadyAdoptedException)
        given().post("/api/pets/{id}/adoption", id).then().statusCode(409);

        // Sudah tidak muncul di daftar available
        given().get("/api/pets").then().body("$", hasSize(0));
    }

    @Test
    void validationErrorsReturn400() {
        given().contentType(ContentType.JSON).body("{}")
                .post("/api/auth/token")
                .then().statusCode(400);
    }

    @Test
    void unknownPetReturns404() {
        given().get("/api/pets/{id}", java.util.UUID.randomUUID().toString()).then().statusCode(404);
    }
}
