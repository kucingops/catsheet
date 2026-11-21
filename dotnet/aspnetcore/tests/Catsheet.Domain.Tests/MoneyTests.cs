using Catsheet.Domain.Common;
using Catsheet.Domain.Pricing;

namespace Catsheet.Domain.Tests;

public class MoneyTests
{
    [Fact]
    public void Record_struct_punya_value_equality()
    {
        // Dua instance berbeda, isi sama → Equals true (beda dengan class biasa).
        Assert.Equal(new Money(10m, "idr"), Money.Idr(10m));
    }

    [Fact]
    public void Operator_overloading_menjumlah_dan_mengali()
    {
        var total = Money.Idr(1_000) + Money.Idr(500) * 3;
        Assert.Equal(Money.Idr(2_500), total);
    }

    [Fact]
    public void Pengurangan_tidak_pernah_negatif()
    {
        Assert.Equal(Money.Idr(0), Money.Idr(100) - Money.Idr(500));
    }

    [Fact]
    public void Beda_currency_dilarang()
    {
        var ex = Assert.Throws<DomainException>(() => Money.Idr(1) + new Money(1, "USD"));
        Assert.Contains("Currency beda", ex.Message);
    }

    // [Theory] + [InlineData] = parameterized test (JUnit 5: @ParameterizedTest + @CsvSource).
    [Theory]
    [InlineData(-1, "IDR")]
    [InlineData(10, "")]
    [InlineData(10, "RUPIAH")]
    public void Input_invalid_ditolak(decimal amount, string currency)
    {
        Assert.Throws<DomainException>(() => new Money(amount, currency));
    }

    // GOTCHA: attribute tidak bisa berisi literal decimal, jadi [InlineData(1.015)] sebenarnya
    // DOUBLE (1.01499999...) yang dikonversi ke decimal → hasil pembulatan salah.
    // Solusinya: TheoryData<decimal, ...> (data dibuat di kode biasa, bukan attribute).
    public static TheoryData<decimal, decimal> RoundingCases => new()
    {
        { 1.005m, 1.00m }, // banker's rounding: .5 dibulatkan ke angka genap
        { 1.015m, 1.02m },
        { 2.499m, 2.50m },
    };

    [Theory]
    [MemberData(nameof(RoundingCases))]
    public void Amount_dibulatkan_2_desimal(decimal input, decimal expected)
    {
        Assert.Equal(expected, Money.Idr(input).Amount);
    }

    [Fact]
    public void Extension_member_Sum()
    {
        Money[] items = [Money.Idr(1), Money.Idr(2), Money.Idr(3)];
        Assert.Equal(Money.Idr(6), items.Sum("IDR"));
    }
}
