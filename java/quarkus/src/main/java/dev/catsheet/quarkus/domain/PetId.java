package dev.catsheet.quarkus.domain;

import java.util.Objects;
import java.util.UUID;

/**
 * Value object untuk identitas Pet.
 *
 * <p>Kenapa nggak pakai {@code String} aja? Biar compiler yang jagain: method
 * {@code findById(PetId)} nggak bisa ketuker dikasih nama kucing atau id adopter.
 * Ini sering disebut "primitive obsession" kalau semua hal dijadikan String/long.</p>
 *
 * <p>{@code record} = class immutable, otomatis dapat constructor, accessor,
 * {@code equals}, {@code hashCode}, {@code toString}.</p>
 */
public record PetId(UUID value) {

    // Compact constructor: tempat validasi invariant record.
    public PetId {
        Objects.requireNonNull(value, "PetId tidak boleh null");
    }

    public static PetId newId() {
        return new PetId(UUID.randomUUID());
    }

    public static PetId of(String raw) {
        return new PetId(UUID.fromString(raw));
    }

    @Override
    public String toString() {
        return value.toString();
    }
}
