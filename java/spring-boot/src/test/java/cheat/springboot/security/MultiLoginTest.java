package cheat.springboot.security;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;

/** Integration test: seluruh filter chain dijalankan lewat MockMvc (tanpa server HTTP sungguhan). */
@SpringBootTest
@AutoConfigureMockMvc
class MultiLoginTest {

    @Autowired
    private MockMvc mvc;

    @Test
    void publicEndpointNeedsNoLogin() throws Exception {
        mvc.perform(get("/public/hello")).andExpect(status().isOk());
    }

    @Nested
    class FormLogin {

        @Test
        void redirectsToLoginPage() throws Exception {
            mvc.perform(get("/form/hello"))
                    .andExpect(status().is3xxRedirection())
                    .andExpect(redirectedUrl("/login"));
        }

        @Test
        void loginCreatesSessionThatIsReused() throws Exception {
            MockHttpSession session = (MockHttpSession) mvc.perform(post("/login")
                            .param("username", "user").param("password", "password")
                            .with(csrf())) // form login wajib CSRF token
                    .andExpect(status().is3xxRedirection())
                    .andReturn().getRequest().getSession();

            mvc.perform(get("/form/hello").session(session))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.user").value("user"));
        }

        @Test
        void loginWithoutCsrfIsRejected() throws Exception {
            mvc.perform(post("/login").param("username", "user").param("password", "password"))
                    .andExpect(status().isForbidden());
        }
    }

    @Nested
    class Basic {

        @Test
        void challengesWith401() throws Exception {
            mvc.perform(get("/basic/hello"))
                    .andExpect(status().isUnauthorized())
                    .andExpect(header().string("WWW-Authenticate", containsString("Basic")));
        }

        @Test
        void acceptsCredentialsOnEveryRequest() throws Exception {
            mvc.perform(get("/basic/hello").with(httpBasic("user", "password")))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.login").value("basic"));
        }

        @Test
        void wrongPassword() throws Exception {
            mvc.perform(get("/basic/hello").with(httpBasic("user", "salah"))).andExpect(status().isUnauthorized());
        }
    }

    @Nested
    class Jwt {

        @Test
        void fullFlowIssueThenUseToken() throws Exception {
            String body = mvc.perform(post("/api/token").with(httpBasic("admin", "admin")))
                    .andExpect(status().isOk())
                    .andReturn().getResponse().getContentAsString();
            String token = JsonPath.read(body, "$.access_token");

            mvc.perform(get("/api/hello").header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.user").value("admin"));
            mvc.perform(get("/api/reports").header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk());
        }

        @Test
        void invalidTokenIs401() throws Exception {
            mvc.perform(get("/api/hello").header("Authorization", "Bearer bukan.token.valid"))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        void sessionFromFormLoginDoesNotWorkOnApi() throws Exception {
            MockHttpSession session = (MockHttpSession) mvc.perform(post("/login")
                            .param("username", "user").param("password", "password").with(csrf()))
                    .andReturn().getRequest().getSession();

            // chain /api/** STATELESS -> tidak membaca SecurityContext dari HttpSession
            mvc.perform(get("/api/hello").session(session)).andExpect(status().isUnauthorized());
        }

        @Test
        void urlRuleAndPreAuthorizeBlockNonAdmin() throws Exception {
            var userJwt = jwt().authorities(new SimpleGrantedAuthority("ROLE_USER")); // mock JWT tanpa encode
            mvc.perform(get("/api/admin/stats").with(userJwt)).andExpect(status().isForbidden());
            mvc.perform(get("/api/reports").with(userJwt)).andExpect(status().isForbidden());
        }

        @Test
        void productsApiNeedsJwt() throws Exception {
            mvc.perform(post("/api/products").with(jwt())
                            .contentType("application/json")
                            .content("{\"name\":\"Kopi\",\"price\":25000}"))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").isNumber());
            mvc.perform(get("/api/products/999").with(jwt())).andExpect(status().isNotFound());
        }
    }
}
