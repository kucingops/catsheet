package dev.catsheet.quarkus.service;

import dev.catsheet.quarkus.domain.Cat;
import dev.catsheet.quarkus.domain.Money;
import dev.catsheet.quarkus.repository.PetRepository;
import io.quarkus.test.InjectMock;
import io.quarkus.test.component.QuarkusComponentTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.util.Optional;

import static dev.catsheet.quarkus.support.TestPets.FIXED_CLOCK;
import static dev.catsheet.quarkus.support.TestPets.cat;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/**
 * Di antara unit test murni dan {@code @QuarkusTest}: {@code @QuarkusComponentTest}.
 *
 * <p>Yang start cuma container CDI (ArC) dengan komponen yang disebut, tanpa HTTP, tanpa DB.
 * Dependency yang tidak tersedia (di sini {@link PetRepository}) otomatis jadi mock.
 * Cocok untuk ngetes wiring CDI asli: constructor injection, interceptor, config.</p>
 */
@QuarkusComponentTest({AdoptionService.class, StandardFeePolicy.class})
class AdoptionServiceComponentTest {

    @Inject
    AdoptionService service;

    @InjectMock
    PetRepository repository;

    /**
     * Clock juga tidak termasuk komponen yang disebut, jadi ikut di-mock.
     * (Sengaja tidak bikin {@code @Produces Clock} di class test: class test juga di-scan sebagai bean
     * oleh {@code @QuarkusTest} lain dan bikin "ambiguous dependency".)
     */
    @InjectMock
    Clock clock;

    @BeforeEach
    void freezeTime() {
        when(clock.instant()).thenReturn(FIXED_CLOCK.instant());
        when(clock.getZone()).thenReturn(FIXED_CLOCK.getZone());
    }

    @Test
    void realFeePolicyIsWiredIntoService() {
        Cat senior = cat("Mbah", 11);
        when(repository.findById(senior.id())).thenReturn(Optional.of(senior));

        assertThat(service.quote(senior.id())).isEqualTo(Money.rupiah(75_000));
    }
}
