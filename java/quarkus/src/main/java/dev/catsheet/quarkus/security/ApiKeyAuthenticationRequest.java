package dev.catsheet.quarkus.security;

import io.quarkus.security.identity.request.BaseAuthenticationRequest;

/** "Credential" mentah yang diambil dari request, belum diverifikasi. */
public class ApiKeyAuthenticationRequest extends BaseAuthenticationRequest {

    private final String apiKey;

    public ApiKeyAuthenticationRequest(String apiKey) {
        this.apiKey = apiKey;
    }

    public String apiKey() {
        return apiKey;
    }
}
