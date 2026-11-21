package dev.catsheet.quarkus.api;

import dev.catsheet.quarkus.service.AdoptionReceipt;

import java.time.LocalDate;

/** Bentuk JSON hasil adopsi. Value object domain (PetId, Money) diratakan jadi tipe sederhana. */
public record AdoptionResponse(String petId, String petName, String adopter, long feeRupiah, LocalDate adoptedOn) {

    public static AdoptionResponse from(AdoptionReceipt receipt) {
        return new AdoptionResponse(receipt.petId().toString(), receipt.petName(), receipt.adopter(),
                receipt.fee().rupiah(), receipt.adoptedOn());
    }
}
