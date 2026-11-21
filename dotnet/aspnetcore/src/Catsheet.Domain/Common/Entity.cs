namespace Catsheet.Domain.Common;

/// <summary>
/// ABSTRACTION + INHERITANCE + GENERICS.
/// Base class untuk semua entity: identitas ditentukan oleh Id, bukan isi field.
/// Java padanannya: <c>abstract class BaseEntity&lt;ID&gt;</c> dengan equals/hashCode by id.
/// </summary>
public abstract class Entity<TId> : IEquatable<Entity<TId>>
    where TId : notnull // generic constraint, mirip <ID extends ...> di Java
{
    // `protected init`: cuma bisa diisi saat konstruksi / object initializer oleh subclass.
    public TId Id { get; protected init; } = default!;

    public bool Equals(Entity<TId>? other) =>
        other is not null
        && other.GetType() == GetType()                    // PhysicalProduct != DigitalProduct walau Id sama
        && EqualityComparer<TId>.Default.Equals(Id, other.Id);

    public override bool Equals(object? obj) => obj is Entity<TId> e && Equals(e);

    public override int GetHashCode() => HashCode.Combine(GetType(), Id);

    // Operator overloading: hal yang TIDAK bisa di Java.
    public static bool operator ==(Entity<TId>? a, Entity<TId>? b) => a?.Equals(b) ?? b is null;
    public static bool operator !=(Entity<TId>? a, Entity<TId>? b) => !(a == b);
}
