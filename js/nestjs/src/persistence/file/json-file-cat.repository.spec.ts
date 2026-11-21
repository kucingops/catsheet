import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Cat } from '../../cats/domain/cat.js';
import { describeCatRepositoryContract } from '../cat-repository.contract.js';
import { JsonFileCatRepository } from './json-file-cat.repository.js';

describeCatRepositoryContract('JsonFileCatRepository', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'catsheet-'));
  return {
    repo: new JsonFileCatRepository(join(dir, 'nested', 'cats.json')),
    teardown: () => rm(dir, { recursive: true, force: true }),
  };
});

describe('JsonFileCatRepository (khusus file)', () => {
  it('data bertahan walau instance repository dibuat ulang (simulasi restart)', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'catsheet-'));
    const file = join(dir, 'cats.json');
    const cat = Cat.create({ name: 'Oyen', breed: 'x', age: 1 });

    await new JsonFileCatRepository(file).save(cat);
    const afterRestart = new JsonFileCatRepository(file);

    expect((await afterRestart.findById(cat.id))?.name).toBe('Oyen');
    expect(JSON.parse(await readFile(file, 'utf8'))[cat.id].name).toBe('Oyen');
    await rm(dir, { recursive: true, force: true });
  });
});
