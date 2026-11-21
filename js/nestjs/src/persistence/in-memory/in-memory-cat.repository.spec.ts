import { describeCatRepositoryContract } from '../cat-repository.contract.js';
import { InMemoryCatRepository } from './in-memory-cat.repository.js';

describeCatRepositoryContract('InMemoryCatRepository', async () => ({ repo: new InMemoryCatRepository() }));
