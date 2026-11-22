package dev.catsheet.quarkus.config;

import io.smallrye.config.ConfigMapping;
import io.smallrye.config.WithDefault;

import java.util.Map;
import java.util.Set;

/**
 * Type-safe config: semua property {@code catsheet.*} di application.properties
 * di-bind ke interface ini saat startup. Salah ketik nama/nilai = aplikasi gagal start,
 * bukan error di tengah jalan. Padanan {@code @ConfigurationProperties} di Spring.
 */
@ConfigMapping(prefix = "catsheet")
public interface CatsheetConfig {

    /** {@code jpa} (database) atau {@code memory} (tanpa persistence). */
    @WithDefault("jpa")
    Storage storage();

    /** Client yang boleh akses pakai header X-API-Key. Key map = nama client. */
    Map<String, ApiClient> apiKeys();

    Jwt jwt();

    enum Storage { JPA, MEMORY }

    interface ApiClient {
        String key();

        Set<String> roles();
    }

    interface Jwt {
        String issuer();

        @WithDefault("PT15M")
        java.time.Duration ttl();
    }
}
