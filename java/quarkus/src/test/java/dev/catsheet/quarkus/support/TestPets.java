package dev.catsheet.quarkus.support;

import dev.catsheet.quarkus.domain.Cat;
import dev.catsheet.quarkus.domain.Dog;
import dev.catsheet.quarkus.domain.DogSize;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;

/**
 * Test data builder / object mother. Satu tempat untuk bikin data test,
 * supaya test fokus ke "apa yang dites", bukan ke setup yang panjang.
 */
public final class TestPets {

    /** Waktu "dibekukan" di 2026-01-01. Semua umur dihitung relatif ke tanggal ini. */
    public static final LocalDate TODAY = LocalDate.of(2026, 1, 1);
    public static final Clock FIXED_CLOCK = Clock.fixed(Instant.parse("2026-01-01T00:00:00Z"), ZoneOffset.UTC);

    private TestPets() {
    }

    public static Cat cat(String name, int ageInYears) {
        return Cat.register(name, TODAY.minusYears(ageInYears), true);
    }

    public static Dog dog(String name, int ageInYears, DogSize size) {
        return Dog.register(name, TODAY.minusYears(ageInYears), size);
    }

    public static Clock clockAt(LocalDate date) {
        return Clock.fixed(date.atStartOfDay(ZoneId.of("UTC")).toInstant(), ZoneOffset.UTC);
    }

    /** JSON request untuk POST /api/pets. */
    public static String catJson(String name) {
        return """
                {"name": "%s", "birthDate": "2024-05-01", "species": "CAT", "indoor": true}
                """.formatted(name);
    }
}
