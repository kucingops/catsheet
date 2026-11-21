# Java 25 + Quarkus 3.40

Cheatsheet Quarkus dalam bentuk aplikasi kecil yang bisa dijalankan: **shelter adopsi hewan**.
Kecil, tapi cukup untuk ngebahas OOP, persistence (pakai DB vs tanpa DB), empat cara login,
dan unit test berlapis. Semua penjelasan ada di komentar kode + folder [`docs/`](docs).

| | Versi |
|---|---|
| Java | 25 (LTS) |
| Quarkus | 3.40.1.2 (platform BOM) |
| Build | Maven 3.9 |
| DB | H2 in-memory (tanpa Docker) |

## Jalankan

```bash
cd java/quarkus
mvn test               # 65 test: unit, component, integration
mvn quarkus:dev        # dev mode + live reload, Dev UI di http://localhost:8080/q/dev-ui
```

Coba endpoint (dev mode):

```bash
# publik
curl localhost:8080/api/pets

# 1) Basic
curl -u alice:alice123 localhost:8080/api/basic/whoami

# 2) Form login -> cookie
curl -c jar -d 'j_username=bob&j_password=bob123' localhost:8080/j_security_check
curl -b jar localhost:8080/api/form/whoami

# 3) JWT
TOKEN=$(curl -s -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"alice123"}' localhost:8080/api/auth/token | jq -r .accessToken)
curl -H "Authorization: Bearer $TOKEN" localhost:8080/api/jwt/whoami

# 4) API key (custom mechanism)
curl -H 'X-API-Key: kunci-rahasia-ops' localhost:8080/api/key/whoami

# admin daftarin kucing, user adopsi
curl -u alice:alice123 -H 'Content-Type: application/json' \
  -d '{"name":"Oyen","birthDate":"2024-05-01","species":"CAT","indoor":true}' localhost:8080/api/pets
curl -u bob:bob123 -X POST localhost:8080/api/pets/<id>/adoption

# ganti storage ke tanpa-database
mvn quarkus:dev -Dcatsheet.storage=memory
```

User demo: `alice / alice123` (admin, user), `bob / bob123` (user).
API key: `kunci-rahasia-bot` (user), `kunci-rahasia-ops` (admin, user).

## Peta isi

| Topik | Baca | Kode utama |
|---|---|---|
| OOP + fitur Java 25 | [docs/01-oop.md](docs/01-oop.md) | `domain/` |
| Persistence vs tanpa persistence | [docs/02-persistence.md](docs/02-persistence.md) | `repository/`, `config/StorageProducer` |
| Security, 4 cara login | [docs/03-security.md](docs/03-security.md) | `security/`, `application.properties` |
| Unit test berlapis | [docs/04-testing.md](docs/04-testing.md) | `src/test/` |
| Quarkus vs Spring Boot | [docs/05-quarkus-vs-spring.md](docs/05-quarkus-vs-spring.md) | |

## Struktur

```
src/main/java/dev/catsheet/quarkus/
├── domain/        # murni Java: Pet (sealed), Cat, Dog, Money, PetId, AdoptionFeePolicy
│                  # tidak import Quarkus/JPA sama sekali
├── service/       # AdoptionService (use case), StandardFeePolicy (strategy)
├── repository/
│   ├── PetRepository.java      # port (interface)
│   ├── memory/                 # ConcurrentHashMap, tanpa persistence
│   └── jpa/                    # Hibernate ORM + Panache, SINGLE_TABLE inheritance
├── security/      # JWT token endpoint, API key mechanism + identity provider
├── api/           # REST resource, DTO, exception mapper
└── config/        # @ConfigMapping, producer (pilih repository, Clock)
```

Alur dependensi satu arah: `api -> service -> domain <- repository`. Domain di tengah,
tidak bergantung ke siapa-siapa. Ini inti dari Hexagonal / Clean Architecture.
