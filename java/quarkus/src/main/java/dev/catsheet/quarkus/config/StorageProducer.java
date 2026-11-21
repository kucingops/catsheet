package dev.catsheet.quarkus.config;

import dev.catsheet.quarkus.repository.PetRepository;
import dev.catsheet.quarkus.repository.jpa.JpaPetRepository;
import dev.catsheet.quarkus.repository.memory.InMemoryPetRepository;
import io.quarkus.logging.Log;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Instance;
import jakarta.enterprise.inject.Produces;
import jakarta.inject.Singleton;

import java.time.Clock;

/**
 * Factory (CDI producer) yang memutuskan implementasi {@link PetRepository} mana yang dipakai.
 *
 * <p>Ini contoh Factory pattern + Dependency Injection: service cukup minta
 * {@code PetRepository}, keputusan "pakai DB atau memory" terpusat di satu tempat.
 * Alternatif lain di Quarkus: {@code @IfBuildProperty} / {@code @LookupIfProperty} /
 * {@code @Alternative}, setara dengan {@code @ConditionalOnProperty} / {@code @Profile} di Spring.</p>
 */
@ApplicationScoped
public class StorageProducer {

    @Produces
    @ApplicationScoped
    PetRepository petRepository(CatsheetConfig config,
                                Instance<JpaPetRepository> jpa,
                                Instance<InMemoryPetRepository> memory) {
        // Instance<T> = lazy lookup; bean yang tidak dipilih tidak pernah dibuat.
        PetRepository chosen = switch (config.storage()) {
            case JPA -> jpa.get();
            case MEMORY -> memory.get();
        };
        Log.infof("Storage: %s", config.storage());
        return chosen;
    }

    /**
     * Clock di-inject, bukan {@code LocalDate.now()} langsung, supaya test bisa
     * "membekukan waktu" pakai {@code Clock.fixed(...)}. Kode yang tergantung jam sistem = susah dites.
     */
    @Produces
    @Singleton
    Clock clock() {
        return Clock.systemDefaultZone();
    }
}
