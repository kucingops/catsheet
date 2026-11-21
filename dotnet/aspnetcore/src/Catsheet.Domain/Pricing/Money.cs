using Catsheet.Domain.Common;

namespace Catsheet.Domain.Pricing;

/// <summary>
/// VALUE OBJECT. <c>readonly record struct</c> =
///  - struct: value type (di stack / inline), tidak ada null
///  - record: Equals/GetHashCode/ToString by value otomatis (seperti Java <c>record</c>)
///  - readonly: immutable, semua field readonly
/// </summary>
public readonly record struct Money
{
    public decimal Amount { get; }
    public string Currency { get; }

    public Money(decimal amount, string currency)
    {
        if (amount < 0) throw new DomainException("Amount tidak boleh negatif.");
        if (string.IsNullOrWhiteSpace(currency) || currency.Length != 3)
            throw new DomainException("Currency harus kode ISO 3 huruf.");

        Amount = decimal.Round(amount, 2, MidpointRounding.ToEven); // banker's rounding
        Currency = currency.ToUpperInvariant();
    }

    public static Money Zero(string currency) => new(0m, currency);
    public static Money Idr(decimal amount) => new(amount, "IDR");

    // Operator overloading bikin kode domain enak dibaca: total = a + b * 3
    public static Money operator +(Money a, Money b)
    {
        EnsureSameCurrency(a, b);
        return new Money(a.Amount + b.Amount, a.Currency);
    }

    public static Money operator -(Money a, Money b)
    {
        EnsureSameCurrency(a, b);
        return new Money(Math.Max(0, a.Amount - b.Amount), a.Currency);
    }

    public static Money operator *(Money a, int qty) => new(a.Amount * qty, a.Currency);

    public static Money operator *(Money a, decimal factor) => new(a.Amount * factor, a.Currency);

    private static void EnsureSameCurrency(Money a, Money b)
    {
        if (a.Currency != b.Currency)
            throw new DomainException($"Currency beda: {a.Currency} vs {b.Currency}");
    }

    public override string ToString() => $"{Currency} {Amount:N2}";
}

/// <summary>
/// C# 14 EXTENSION MEMBERS (blok <c>extension</c>): menambah method ke tipe yang sudah ada
/// tanpa inheritance. Java tidak punya ini (paling dekat: static utility method).
/// </summary>
public static class MoneyExtensions
{
    extension(IEnumerable<Money> source)
    {
        public Money Sum(string currency) =>
            source.Aggregate(Money.Zero(currency), (acc, m) => acc + m);
    }
}
