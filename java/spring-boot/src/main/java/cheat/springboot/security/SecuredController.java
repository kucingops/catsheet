package cheat.springboot.security;

import java.security.Principal;
import java.util.Map;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SecuredController {

    private final TokenService tokenService;

    public SecuredController(TokenService tokenService) {
        this.tokenService = tokenService;
    }

    @GetMapping("/public/hello")
    public Map<String, String> publicHello() {
        return Map.of("message", "tanpa login");
    }

    @GetMapping("/form/hello")
    public Map<String, String> formHello(Principal principal) {
        return Map.of("login", "form+session", "user", principal.getName());
    }

    @GetMapping("/basic/hello")
    public Map<String, String> basicHello(Principal principal) {
        return Map.of("login", "basic", "user", principal.getName());
    }

    @PostMapping("/api/token")
    public Map<String, String> token(Authentication auth) {
        return Map.of("access_token", tokenService.issue(auth), "token_type", "Bearer");
    }

    @GetMapping("/api/hello")
    public Map<String, String> jwtHello(Principal principal) {
        return Map.of("login", "jwt", "user", principal.getName());
    }

    @GetMapping("/api/admin/stats")
    public Map<String, String> adminStats() {
        return Map.of("access", "URL rule: hasRole(ADMIN)");
    }

    @GetMapping("/api/reports")
    @PreAuthorize("hasRole('ADMIN')") // method-level authorization
    public Map<String, String> reports() {
        return Map.of("access", "@PreAuthorize hasRole(ADMIN)");
    }
}
