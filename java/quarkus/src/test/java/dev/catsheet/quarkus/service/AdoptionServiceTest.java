package dev.catsheet.quarkus.service;

import dev.catsheet.quarkus.domain.AdoptionFeePolicy;
import dev.catsheet.quarkus.domain.AdoptionStatus;
import dev.catsheet.quarkus.domain.Cat;
import dev.catsheet.quarkus.domain.Money;
import dev.catsheet.quarkus.domain.Pet;
import dev.catsheet.quarkus.domain.PetAlreadyAdoptedException;
import dev.catsheet.quarkus.domain.PetId;
import dev.catsheet.quarkus.domain.PetNotFoundException;
import dev.catsheet.quarkus.repository.PetRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static dev.catsheet.quarkus.support.TestPets.FIXED_CLOCK;
import static dev.catsheet.quarkus.support.TestPets.TODAY;
import static dev.catsheet.quarkus.support.TestPets.cat;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

/**
 * Unit test service dengan Mockito, TANPA Quarkus.
 *
 * <ul>
 *   <li>{@link PetRepository} = <b>mock</b> (kita atur jawabannya dan verifikasi interaksinya).</li>
 *   <li>{@link AdoptionFeePolicy} = <b>stub via lambda</b> (tidak perlu Mockito untuk functional interface).</li>
 *   <li>{@code Clock} = <b>fake</b> ({@code Clock.fixed}).</li>
 * </ul>
 * Gaya given/when/then pakai {@code BDDMockito}.
 */
@ExtendWith(MockitoExtension.class)
class AdoptionServiceTest {

    @Mock
    PetRepository repository;

    @Captor
    ArgumentCaptor<Pet> savedPet;

    private final AdoptionFeePolicy flatFee = pet -> Money.rupiah(99_000);

    private AdoptionService service;

    @BeforeEach
    void setUp() {
        service = new AdoptionService(repository, flatFee, FIXED_CLOCK);
    }

    @Test
    void adoptSavesPetAndReturnsReceipt() {
        Cat oyen = cat("Oyen", 2);
        given(repository.findById(oyen.id())).willReturn(Optional.of(oyen));

        AdoptionReceipt receipt = service.adopt(oyen.id(), "bob");

        assertThat(receipt).isEqualTo(new AdoptionReceipt(oyen.id(), "Oyen", "bob", Money.rupiah(99_000), TODAY));
        then(repository).should().save(savedPet.capture());
        assertThat(savedPet.getValue().status()).isEqualTo(AdoptionStatus.ADOPTED);
    }

    @Test
    void adoptUnknownPetThrowsAndSavesNothing() {
        PetId unknown = PetId.newId();
        given(repository.findById(unknown)).willReturn(Optional.empty());

        assertThatThrownBy(() -> service.adopt(unknown, "bob")).isInstanceOf(PetNotFoundException.class);
        then(repository).should(org.mockito.Mockito.never()).save(any());
    }

    @Test
    void adoptAlreadyAdoptedPetIsRejected() {
        Cat oyen = cat("Oyen", 2);
        oyen.adopt("alice");
        given(repository.findById(oyen.id())).willReturn(Optional.of(oyen));

        assertThatThrownBy(() -> service.adopt(oyen.id(), "bob")).isInstanceOf(PetAlreadyAdoptedException.class);
        then(repository).should(org.mockito.Mockito.never()).save(any());
    }

    @Test
    void quoteUsesInjectedPolicy() {
        Cat oyen = cat("Oyen", 2);
        given(repository.findById(oyen.id())).willReturn(Optional.of(oyen));

        assertThat(service.quote(oyen.id())).isEqualTo(Money.rupiah(99_000));
    }
}
