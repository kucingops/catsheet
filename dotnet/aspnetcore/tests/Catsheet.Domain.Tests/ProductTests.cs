using Catsheet.Domain.Catalog;
using Catsheet.Domain.Common;
using Catsheet.Domain.Pricing;

namespace Catsheet.Domain.Tests;

public class ProductTests
{
    [Fact]
    public void Encapsulation_stok_hanya_berubah_lewat_method()
    {
        var book = TestData.Book(stock: 5);

        book.Restock(3);
        book.Reserve(2);

        Assert.Equal(6, book.Stock);
        // book.Stock = 100;  // <- tidak compile: setter private. Itu intinya encapsulation.
    }

    [Fact]
    public void Reserve_melebihi_stok_ditolak_dan_stok_tidak_berubah()
    {
        var book = TestData.Book(stock: 1);

        var ex = Assert.Throws<DomainException>(() => book.Reserve(2));

        Assert.Contains("Stok", ex.Message);
        Assert.Equal(1, book.Stock);
    }

    [Fact]
    public void Polymorphism_produk_digital_stok_tak_terbatas()
    {
        Product ebook = TestData.Ebook(); // tipe variabel = base class

        ebook.Reserve(1_000); // HasUnlimitedStock di-override → tidak error

        Assert.Equal(0, ebook.Stock);
    }

    // MemberData: sumber data dari property/method (JUnit 5: @MethodSource).
    public static TheoryData<Product, decimal> ShippingCases => new()
    {
        { TestData.Book(weightKg: 0.4m), 10_000m }, // dibulatkan ke 1 kg
        { TestData.Book(weightKg: 2.1m), 30_000m }, // 3 kg
        { TestData.Ebook(), 0m },
    };

    [Theory]
    [MemberData(nameof(ShippingCases))]
    public void Polymorphism_ShippingCost_sesuai_tipe_runtime(Product product, decimal expected)
    {
        Assert.Equal(expected, product.ShippingCost().Amount);
    }

    [Fact]
    public void Entity_equality_berdasarkan_Id_dan_tipe()
    {
        var id = Guid.NewGuid();
        var a = new PhysicalProduct(id, "A", Money.Idr(1), 1, 1);
        var b = new PhysicalProduct(id, "B beda nama", Money.Idr(2), 9, 2);
        var c = new DigitalProduct(id, "C", Money.Idr(1), "https://x.y/z");

        Assert.Equal(a, b);           // Id sama, tipe sama → entity yang sama
        Assert.True(a == b);          // operator == di-overload
        Assert.NotEqual<Product>(a, c); // Id sama tapi tipe beda
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Nama_kosong_ditolak(string name)
    {
        Assert.ThrowsAny<ArgumentException>(() => TestData.Book().Rename(name));
    }

    [Fact]
    public void Nama_terlalu_panjang_ditolak()
    {
        Assert.Throws<DomainException>(() => TestData.Book().Rename(new string('x', Product.MaxNameLength + 1)));
    }

    [Fact]
    public void DigitalProduct_wajib_url_absolut()
    {
        Assert.Throws<DomainException>(() => DigitalProduct.Create("x", Money.Idr(1), "bukan-url"));
    }
}
