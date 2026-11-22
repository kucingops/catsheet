package dev.catsheet.quarkus.domain;

import java.time.LocalDate;

/**
 * {@code final}: tidak boleh di-extend lagi. Subclass dari sealed class wajib
 * memilih salah satu: {@code final}, {@code sealed}, atau {@code non-sealed}.
 */
public final class Cat extends Pet {

    public static final int MAX_NAME_LENGTH = 50;
    private static final Money BASE_FEE = Money.rupiah(150_000);

    private final boolean indoor;

    public Cat(PetId id, String name, LocalDate birthDate, boolean indoor, String adopter) {
        // Java 25 (JEP 513, flexible constructor bodies): boleh ada statement SEBELUM super(...),
        // termasuk validasi dan assign field milik class ini, asal belum menyentuh `this` lainnya.
        // Dulu harus pakai trik static helper method di argumen super(...).
        if (name != null && name.length() > MAX_NAME_LENGTH) {
            throw new IllegalArgumentException("Nama kucing maksimal " + MAX_NAME_LENGTH + " karakter");
        }
        this.indoor = indoor;
        super(id, name, birthDate, adopter);
    }

    /** Static factory: nama yang jelas untuk "hewan baru masuk shelter". */
    public static Cat register(String name, LocalDate birthDate, boolean indoor) {
        return new Cat(PetId.newId(), name, birthDate, indoor, null);
    }

    public boolean indoor() {
        return indoor;
    }

    @Override
    public Money baseAdoptionFee() {
        return BASE_FEE;
    }

    @Override
    public String sound() {
        return "meong";
    }

    @Override
    public String species() {
        return "CAT";
    }

    /** Kucing hidup lebih lama, jadi baru dianggap senior di umur 10. */
    @Override
    protected int seniorAgeInYears() {
        return 10;
    }
}
