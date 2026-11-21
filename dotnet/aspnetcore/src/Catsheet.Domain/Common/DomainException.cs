namespace Catsheet.Domain.Common;

/// <summary>
/// Exception khusus pelanggaran aturan bisnis (invariant).
/// Di C# semua exception "unchecked": tidak ada <c>throws</c> seperti di Java.
/// </summary>
public class DomainException(string message) : Exception(message);
