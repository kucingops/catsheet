package dev.catsheet.quarkus.service;

import dev.catsheet.quarkus.domain.DogSize;
import dev.catsheet.quarkus.domain.Money;
import dev.catsheet.quarkus.domain.Pet;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.stream.Stream;

import static dev.catsheet.quarkus.support.TestPets.FIXED_CLOCK;
import static dev.catsheet.quarkus.support.TestPets.cat;
import static dev.catsheet.quarkus.support.TestPets.dog;
import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.params.provider.Arguments.arguments;

class StandardFeePolicyTest {

    // Clock dibekukan: hasil test tidak berubah walau dijalankan tahun depan.
    private final StandardFeePolicy policy = new StandardFeePolicy(FIXED_CLOCK);

    static Stream<Arguments> fees() {
        return Stream.of(
                arguments("kucing muda", cat("Oyen", 2), 150_000),
                arguments("kucing senior", cat("Mbah", 12), 75_000),
                arguments("anjing kecil muda", dog("Chiko", 1, DogSize.SMALL), 200_000),
                arguments("anjing besar senior", dog("Bruno", 9, DogSize.LARGE), 150_000));
    }

    @ParameterizedTest(name = "{0} -> Rp{2}")
    @MethodSource("fees")
    void feeDependsOnSpeciesSizeAndAge(String label, Pet pet, long expected) {
        assertThat(policy.feeFor(pet)).isEqualTo(Money.rupiah(expected));
    }
}
