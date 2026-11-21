package dev.catsheet.quarkus.service;

import dev.catsheet.quarkus.domain.AdoptionFeePolicy;
import dev.catsheet.quarkus.domain.Money;
import dev.catsheet.quarkus.domain.Pet;
import jakarta.enterprise.context.ApplicationScoped;

import java.time.Clock;

/**
 * Implementasi default {@link AdoptionFeePolicy}: biaya dasar dari tiap jenis hewan
 * (polymorphism), diskon 50% untuk hewan senior.
 */
@ApplicationScoped
public class StandardFeePolicy implements AdoptionFeePolicy {

    static final int SENIOR_DISCOUNT_PERCENT = 50;

    private final Clock clock;

    // Constructor injection: dependency jelas, field bisa final, gampang di-new di unit test.
    // Di Quarkus, @Inject boleh dihilangkan kalau constructor-nya cuma satu.
    public StandardFeePolicy(Clock clock) {
        this.clock = clock;
    }

    @Override
    public Money feeFor(Pet pet) {
        Money base = pet.baseAdoptionFee(); // tidak ada if (pet instanceof Cat) di sini
        return pet.isSenior(clock) ? base.discount(SENIOR_DISCOUNT_PERCENT) : base;
    }
}
