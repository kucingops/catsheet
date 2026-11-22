namespace Catsheet.Api.Security;

/// <summary>Nama-nama authentication scheme. Satu app bisa punya banyak scheme sekaligus.</summary>
public static class AuthSchemes
{
    public const string Cookie = "Cookie";
    public const string Basic = "Basic";
    public const string Jwt = "Bearer";
    public const string ApiKey = "ApiKey";

    /// <summary>"Policy scheme": bukan login beneran, tugasnya cuma memilih scheme lain per request.</summary>
    public const string Smart = "Smart";
}

public static class Roles
{
    public const string Admin = "Admin";
    public const string User = "User";
    public const string Service = "Service";
}

public static class Permissions
{
    public const string ClaimType = "permission";
    public const string CatalogWrite = "catalog:write";
    public const string OrderCheckout = "order:checkout";
}

public static class Policies
{
    public const string CanWriteCatalog = nameof(CanWriteCatalog);
    public const string CanCheckout = nameof(CanCheckout);
    public const string AdminOnly = nameof(AdminOnly);
}
