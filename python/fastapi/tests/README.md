# Unit test dengan pytest

```bash
uv run pytest                      # semua (82 test, ~7 detik, mayoritas waktu buat hashing Argon2)
uv run pytest -k jwt -v            # filter nama test
uv run pytest tests/test_repositories.py -x   # stop di failure pertama
uv run pytest --lf                 # jalanin ulang yang gagal terakhir
```

## Piramida test di folder ini

| File | Jenis | Yang dites | Dependency luar |
|---|---|---|---|
| `test_domain.py` | unit | aturan bisnis `Note`, `User` | nggak ada |
| `test_note_service.py` | unit | service, pakai **Mock** dan **Fake** | nggak ada |
| `test_security_unit.py` | unit | hashing, JWT, authenticator, pakai `Request` palsu | nggak ada |
| `test_repositories.py` | contract / integration | 4 repository, test yang sama | file tmp, SQLite in-memory |
| `test_api.py` | integration | HTTP end-to-end via `TestClient` | app utuh |

## JUnit 5 + Mockito → pytest

| JUnit / Mockito | pytest / unittest.mock |
|---|---|
| `@Test` | fungsi `def test_*()` |
| `assertEquals(a, b)` | `assert a == b` (pytest kasih diff detail) |
| `assertThrows(X.class, ...)` | `with pytest.raises(X, match="regex"):` |
| `@BeforeEach` / `@AfterEach` | `@pytest.fixture` + `yield` |
| `@BeforeAll` | `@pytest.fixture(scope="module")` atau `"session"` |
| `@ParameterizedTest` | `@pytest.mark.parametrize` / `@pytest.fixture(params=[...])` |
| `@Disabled` | `@pytest.mark.skip` |
| `@Tag` | `@pytest.mark.<nama>` + `-m nama` |
| `@TempDir` | fixture `tmp_path` |
| `mock(Foo.class)` | `Mock(spec=Foo)` / `create_autospec(Foo, instance=True)` |
| `when(m.x()).thenReturn(v)` | `m.x.return_value = v` |
| `thenThrow` / `thenAnswer` | `m.x.side_effect = Exc()` / `= lambda ...` |
| `verify(m).x(args)` | `m.x.assert_called_once_with(args)` |
| `verify(m, never()).x()` | `m.x.assert_not_called()` |
| `ArgumentCaptor` | `m.x.call_args.args[0]` |
| `@MockBean` | `app.dependency_overrides[dep] = lambda: fake` atau `create_app(repo=fake)` |
| `@SpringBootTest` + MockMvc | `TestClient(app)` |
| `System.setProperty` sementara | fixture `monkeypatch.setenv(...)` |

## Teknik yang dipakai

- **Fixture berparameter** (`any_repo` di `conftest.py`): satu test otomatis jalan 4x untuk 4 storage.
- **Mock vs Fake**: mock buat verifikasi *interaksi* ("delete nggak boleh dipanggil kalau bukan owner"),
  fake buat verifikasi *state*. Fake biasanya lebih tahan refactor.
- **`create_autospec`** bikin mock ngikutin signature asli, jadi salah nama method/argumen langsung gagal.
- **Inject waktu** (`TokenService.issue(now=...)`) supaya test token expired nggak perlu `sleep`.
- **App factory** `create_app(settings, repo=...)`, tiap test dapat app & storage baru → test terisolasi.
- **`scope="module"`** untuk fixture mahal (user store dengan hash Argon2).
- **Test security negatif**: alg `none`, secret beda, header rusak, kredensial salah nggak boleh fallback.

## Pertanyaan interview

1. Bedanya mock, stub, fake, spy?
2. Kenapa test harus terisolasi & deterministik? Gimana handle waktu / random?
3. Unit test vs integration test: di mana batasnya? (di sini: unit = tanpa I/O)
4. Gimana test kode yang pakai database? (in-memory DB, testcontainers untuk Postgres beneran,
   transaksi di-rollback tiap test)
5. Coverage: `uv run --with pytest-cov pytest --cov=app`. 100% coverage ≠ bebas bug.
