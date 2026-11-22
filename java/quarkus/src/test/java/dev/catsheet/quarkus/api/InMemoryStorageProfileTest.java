package dev.catsheet.quarkus.api;

import dev.catsheet.quarkus.repository.PetRepository;
import dev.catsheet.quarkus.repository.jpa.PetEntityDao;
import dev.catsheet.quarkus.repository.memory.InMemoryPetRepository;
import io.quarkus.arc.ClientProxy;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.QuarkusTestProfile;
import io.quarkus.test.junit.TestProfile;
import io.quarkus.test.security.TestSecurity;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static dev.catsheet.quarkus.support.TestPets.catJson;
import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * {@code @TestProfile}: jalankan aplikasi dengan config berbeda (di sini storage=memory).
 * Quarkus restart sekali untuk profile ini, jadi kelompokkan test per profile biar cepat.
 */
@QuarkusTest
@TestProfile(InMemoryStorageProfileTest.MemoryStorage.class)
class InMemoryStorageProfileTest {

    public static class MemoryStorage implements QuarkusTestProfile {
        @Override
        public Map<String, String> getConfigOverrides() {
            return Map.of("catsheet.storage", "memory");
        }
    }

    @Inject
    PetRepository repository;

    @Inject
    PetEntityDao dao;

    @Test
    @TestSecurity(user = "alice", roles = "admin")
    void dataGoesToMemoryNotDatabase() {
        assertThat(ClientProxy.unwrap(repository)).isInstanceOf(InMemoryPetRepository.class);

        given().contentType(ContentType.JSON).body(catJson("Oyen"))
                .post("/api/pets")
                .then().statusCode(201);

        assertThat(repository.count()).isEqualTo(1);
        long rowsInDatabase = QuarkusTransaction.requiringNew().call(dao::count);
        assertThat(rowsInDatabase)
                .as("tabel pet di database tetap kosong")
                .isZero();
    }
}
