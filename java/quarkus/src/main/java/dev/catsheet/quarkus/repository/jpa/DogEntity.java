package dev.catsheet.quarkus.repository.jpa;

import dev.catsheet.quarkus.domain.DogSize;
import jakarta.persistence.Column;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;

@Entity
@DiscriminatorValue("DOG")
public class DogEntity extends PetEntity {

    @Enumerated(EnumType.STRING)
    @Column(name = "dog_size", length = 10)
    public DogSize size;
}
