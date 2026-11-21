package dev.catsheet.quarkus.repository.jpa;

import jakarta.persistence.Column;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;

@Entity
@DiscriminatorValue("CAT")
public class CatEntity extends PetEntity {

    /** Nullable di DB karena baris DOG tidak punya nilai ini (konsekuensi SINGLE_TABLE). */
    @Column(name = "indoor")
    public Boolean indoor;
}
