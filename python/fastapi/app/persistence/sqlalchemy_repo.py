"""Persistence pakai ORM: SQLAlchemy 2.x (style baru, typed). Setara JPA/Hibernate.

Mapping konsep ke Spring/JPA:
    DeclarativeBase / Mapped[...]   -> @Entity / @Column
    Session                         -> EntityManager / persistence context
    session.begin() (context mgr)   -> @Transactional
    session.get(Model, id)          -> em.find()
    select(Model).where(...)        -> JPQL / Criteria API
    expire_on_commit, lazy loading  -> sama: akses relasi di luar session -> error
                                       (mirip LazyInitializationException)

Di sini ORM model (NoteRow) SENGAJA dipisah dari domain (Note), jadi butuh mapping
dua arah. Trade-off: lebih banyak kode, tapi domain bebas dari detail database.
"""

from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text, TypeDecorator, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker
from sqlalchemy.pool import StaticPool

from app.domain.models import Note


class UtcDateTime(TypeDecorator[datetime]):
    """Custom column type (mirip AttributeConverter di JPA).

    SQLite nggak punya tipe timestamp with time zone, jadi tzinfo hilang saat dibaca
    balik. Bug klasik ini ketahuan dari contract test (tests/test_repositories.py).
    """

    impl = DateTime
    cache_ok = True

    def process_bind_param(self, value: datetime | None, dialect) -> datetime | None:
        return value.astimezone(UTC) if value else None

    def process_result_value(self, value: datetime | None, dialect) -> datetime | None:
        if value is None:
            return None
        return value.replace(tzinfo=UTC) if value.tzinfo is None else value


class Base(DeclarativeBase):
    pass


class NoteRow(Base):
    __tablename__ = "notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(100))
    body: Mapped[str] = mapped_column(Text)
    owner: Mapped[str] = mapped_column(String(50), index=True)
    archived: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(UtcDateTime(timezone=True))

    def to_domain(self) -> Note:
        return Note(
            id=self.id,
            title=self.title,
            body=self.body,
            owner=self.owner,
            archived=self.archived,
            created_at=self.created_at,
        )


class SqlAlchemyNoteRepository:
    def __init__(self, url: str = "sqlite+pysqlite:///:memory:") -> None:
        kwargs: dict = {}
        if url.endswith(":memory:"):
            # in-memory sqlite: semua koneksi harus pakai koneksi yang SAMA, kalau nggak
            # tiap koneksi dapat database kosong sendiri-sendiri
            kwargs = {"connect_args": {"check_same_thread": False}, "poolclass": StaticPool}
        self._engine = create_engine(url, **kwargs)
        # Produksi: pakai Alembic (mirip Flyway/Liquibase), bukan create_all
        Base.metadata.create_all(self._engine)
        self._session = sessionmaker(self._engine, expire_on_commit=False)

    def save(self, note: Note) -> Note:
        with self._session.begin() as s:  # begin() -> auto commit / rollback
            if note.id is None:
                row = NoteRow(
                    title=note.title,
                    body=note.body,
                    owner=note.owner,
                    archived=note.archived,
                    created_at=note.created_at,
                )
                s.add(row)
                s.flush()  # paksa INSERT supaya id ter-generate sebelum commit
            else:
                row = s.get(NoteRow, note.id)
                if row is None:
                    raise ValueError(f"note {note.id} tidak ada")
                # dirty checking: cukup ubah atribut, UPDATE otomatis saat commit
                row.title, row.body, row.archived = note.title, note.body, note.archived
            s.flush()
            return row.to_domain()

    def get(self, note_id: int) -> Note | None:
        with self._session() as s:
            row = s.get(NoteRow, note_id)
            return row.to_domain() if row else None

    def list_by_owner(self, owner: str, *, include_archived: bool = False) -> list[Note]:
        stmt = select(NoteRow).where(NoteRow.owner == owner).order_by(NoteRow.id)
        if not include_archived:
            stmt = stmt.where(NoteRow.archived.is_(False))
        with self._session() as s:
            return [r.to_domain() for r in s.scalars(stmt)]

    def list_all(self) -> list[Note]:
        with self._session() as s:
            return [r.to_domain() for r in s.scalars(select(NoteRow).order_by(NoteRow.id))]

    def delete(self, note_id: int) -> bool:
        with self._session.begin() as s:
            row = s.get(NoteRow, note_id)
            if row is None:
                return False
            s.delete(row)
            return True

    def close(self) -> None:
        self._engine.dispose()
