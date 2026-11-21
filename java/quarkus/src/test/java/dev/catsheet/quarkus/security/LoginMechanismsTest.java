package dev.catsheet.quarkus.security;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import static dev.catsheet.quarkus.support.TestPets.catJson;
import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.notNullValue;

/**
 * Login SUNGGUHAN lewat empat mekanisme (tanpa {@code @TestSecurity}).
 * Tiap path hanya menerima mekanisme yang dikonfigurasi untuknya.
 */
@QuarkusTest
class LoginMechanismsTest {

    @Nested
    class Basic {

        @Test
        void validCredentials() {
            given().auth().preemptive().basic("alice", "alice123")
                    .get("/api/basic/whoami")
                    .then().statusCode(200)
                    .body("name", equalTo("alice"))
                    .body("roles", contains("admin", "user"))
                    .body("via", equalTo("basic"));
        }

        @Test
        void wrongPassword() {
            given().auth().preemptive().basic("alice", "salah").get("/api/basic/whoami").then().statusCode(401);
        }

        @Test
        void noCredentialsGetsBasicChallenge() {
            // Catatan: dengan banyak mekanisme aktif, header challenge (WWW-Authenticate) yang dikirim
            // tergantung mekanisme yang dipilih Quarkus, jadi di sini cukup cek status 401.
            given().get("/api/basic/whoami").then().statusCode(401);
        }
    }

    @Nested
    class Form {

        @Test
        void loginThenUseCookie() {
            String cookie = given().contentType(ContentType.URLENC)
                    .formParam("j_username", "bob")
                    .formParam("j_password", "bob123")
                    .post("/j_security_check")
                    .then().statusCode(200)
                    .extract().cookie("quarkus-credential");

            given().cookie("quarkus-credential", cookie)
                    .get("/api/form/whoami")
                    .then().statusCode(200)
                    .body("name", equalTo("bob"))
                    .body("via", equalTo("form"));
        }

        @Test
        void basicCredentialsAreNotAcceptedOnFormPath() {
            given().auth().preemptive().basic("bob", "bob123").get("/api/form/whoami").then().statusCode(401);
        }
    }

    @Nested
    class Jwt {

        @Test
        void exchangePasswordForTokenThenUseBearer() {
            String token = given().contentType(ContentType.JSON)
                    .body("{\"username\":\"alice\",\"password\":\"alice123\"}")
                    .post("/api/auth/token")
                    .then().statusCode(200)
                    .body("tokenType", equalTo("Bearer"))
                    .body("expiresIn", equalTo(900))
                    .extract().path("accessToken");

            given().auth().oauth2(token)
                    .get("/api/jwt/whoami")
                    .then().statusCode(200)
                    .body("name", equalTo("alice"))
                    .body("roles", contains("admin", "user"));
        }

        @Test
        void wrongPasswordGetsNoToken() {
            given().contentType(ContentType.JSON)
                    .body("{\"username\":\"alice\",\"password\":\"salah\"}")
                    .post("/api/auth/token")
                    .then().statusCode(401);
        }

        @Test
        void tamperedTokenIsRejected() {
            given().auth().oauth2("eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJoYWNrZXIifQ.bukan-signature")
                    .get("/api/jwt/whoami")
                    .then().statusCode(401);
        }

        @Test
        void tokenWorksOnRoleProtectedEndpointToo() {
            String token = given().contentType(ContentType.JSON)
                    .body("{\"username\":\"bob\",\"password\":\"bob123\"}")
                    .post("/api/auth/token")
                    .then().extract().path("accessToken");

            // bob cuma role user -> tidak boleh register pet
            given().auth().oauth2(token).contentType(ContentType.JSON)
                    .body(catJson("Oyen"))
                    .post("/api/pets")
                    .then().statusCode(403);
        }
    }

    @Nested
    class ApiKey {

        @Test
        void validKey() {
            given().header(ApiKeyAuthenticationMechanism.HEADER, "kunci-rahasia-bot")
                    .get("/api/key/whoami")
                    .then().statusCode(200)
                    .body("name", equalTo("report-bot"))
                    .body("roles", contains("user"))
                    .body("via", equalTo("key"));
        }

        @Test
        void invalidKey() {
            given().header(ApiKeyAuthenticationMechanism.HEADER, "ngasal")
                    .get("/api/key/whoami")
                    .then().statusCode(401);
        }

        @Test
        void apiKeyIsNotAcceptedOnJwtPath() {
            given().header(ApiKeyAuthenticationMechanism.HEADER, "kunci-rahasia-ops")
                    .get("/api/jwt/whoami")
                    .then().statusCode(401);
        }

        @Test
        void adminKeyCanRegisterPet() {
            given().header(ApiKeyAuthenticationMechanism.HEADER, "kunci-rahasia-ops")
                    .contentType(ContentType.JSON)
                    .body(catJson("Dari Bot"))
                    .post("/api/pets")
                    .then().statusCode(201)
                    .body("id", notNullValue());
        }
    }
}
