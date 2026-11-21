import { Test } from '@nestjs/testing';
import { ConflictError, NotFoundError } from '../common/domain-error.js';
import { InMemoryCatRepository } from '../persistence/in-memory/in-memory-cat.repository.js';
import { CatRepository } from './cat.repository.js';
import { CatsService } from './cats.service.js';
import { Cat } from './domain/cat.js';

/**
 * Dua gaya unit test service:
 *  1. FAKE  : implementasi ringan yang beneran jalan (InMemoryCatRepository). Test fokus ke hasil/perilaku.
 *  2. MOCK  : vi.fn() / object stub. Test fokus ke interaksi ("save dipanggil dengan apa?").
 * Fake biasanya lebih tahan refactor; mock berguna untuk kasus error atau verifikasi panggilan.
 * (Padanan Mockito: vi.fn() ~ mock(), mockResolvedValue ~ when().thenReturn(), toHaveBeenCalledWith ~ verify())
 */
describe('CatsService', () => {
  describe('dengan FAKE repository (tanpa Nest)', () => {
    let service: CatsService;
    beforeEach(() => {
      service = new CatsService(new InMemoryCatRepository()); // plain constructor, tanpa container DI
    });

    it('register lalu findOne', async () => {
      const cat = await service.register({ name: 'Oyen', breed: 'Domestik', age: 2 });
      expect((await service.findOne(cat.id)).name).toBe('Oyen');
    });

    it('adopt menyimpan perubahan; adopt kedua kali conflict', async () => {
      const { id } = await service.register({ name: 'Oyen', breed: 'Domestik', age: 2 });
      await service.adopt(id, 'alice');
      expect((await service.findOne(id)).adoptedBy).toBe('alice');
      await expect(service.adopt(id, 'bob')).rejects.toThrow(ConflictError);
    });

    it('stats', async () => {
      await service.register({ name: 'Oyen', breed: 'Domestik', age: 2 });
      const { id } = await service.register({ name: 'Mochi', breed: 'Persia', age: 1 });
      await service.register({ name: 'Belang', breed: 'Domestik', age: 4 });
      await service.adopt(id, 'alice');
      expect(await service.stats()).toEqual({
        total: 3,
        available: 2,
        adopted: 1,
        byBreed: { Domestik: 2, Persia: 1 },
      });
    });
  });

  describe('dengan MOCK repository (lewat Nest TestingModule)', () => {
    let service: CatsService;
    const repo = {
      findAll: vi.fn(),
      findById: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    } satisfies Record<keyof CatRepository, unknown>;

    beforeEach(async () => {
      vi.resetAllMocks();
      // Test.createTestingModule = padanan @SpringBootTest slice / @MockBean.
      const moduleRef = await Test.createTestingModule({
        providers: [CatsService, { provide: CatRepository, useValue: repo }],
      }).compile();
      service = moduleRef.get(CatsService);
    });

    it('findOne melempar NotFoundError kalau repo mengembalikan null', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.findOne('x')).rejects.toBeInstanceOf(NotFoundError);
      expect(repo.findById).toHaveBeenCalledWith('x');
    });

    it('adopt memanggil save dengan kucing yang sudah berubah status', async () => {
      repo.findById.mockResolvedValue(Cat.create({ name: 'Oyen', breed: 'x', age: 1 }));
      await service.adopt('any', 'alice');
      expect(repo.save).toHaveBeenCalledOnce();
      expect(repo.save.mock.calls[0][0].status).toBe('adopted');
    });

    it('adopt yang gagal TIDAK memanggil save', async () => {
      const cat = Cat.create({ name: 'Oyen', breed: 'x', age: 1 });
      cat.adopt('alice');
      repo.findById.mockResolvedValue(cat);
      await expect(service.adopt('any', 'bob')).rejects.toThrow(ConflictError);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('remove: NotFound kalau delete mengembalikan false', async () => {
      repo.delete.mockResolvedValue(false);
      await expect(service.remove('x')).rejects.toThrow(NotFoundError);
    });
  });
});
