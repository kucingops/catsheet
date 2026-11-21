package dev.catsheet.quarkus.domain;

/**
 * Enum juga object: bisa punya field dan method.
 * Biaya adopsi anjing tergantung ukuran, datanya nempel langsung di enum.
 */
public enum DogSize {
    SMALL(200_000),
    MEDIUM(250_000),
    LARGE(300_000);

    private final Money baseFee;

    DogSize(long rupiah) {
        this.baseFee = Money.rupiah(rupiah);
    }

    public Money baseFee() {
        return baseFee;
    }
}
