package dev.catsheet.quarkus.service;

import dev.catsheet.quarkus.domain.Money;
import dev.catsheet.quarkus.domain.PetId;

import java.time.LocalDate;

public record AdoptionReceipt(PetId petId, String petName, String adopter, Money fee, LocalDate adoptedOn) {
}
