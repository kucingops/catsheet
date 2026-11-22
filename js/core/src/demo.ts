// Jalankan: `npm run demo` atau `node src/demo.ts` (Node 26 bisa langsung eksekusi TypeScript lewat type stripping).
import { pipe, tax11 } from './01-functions.ts';
import { createAccount } from './02-closures.ts';
import { addCat, countCats } from './03-modules.ts';
import { makeCat } from './04-objects-prototypes-this.ts';
import { bulkItem10Percent, minimumSpend, total, totalArea } from './05-functional.ts';
import { createCatService, createInMemoryRepo, shippingCost } from './06-polymorphism-and-composition.ts';
import { eventLoopOrder, parallel, sleep } from './07-async.ts';
import { withLogging } from './08-patterns-the-js-way.ts';
import { LruCache } from './09-classes-when-idiomatic.ts';

const slug = pipe<string>(
  (s) => s.trim().toLowerCase(),
  (s) => s.replaceAll(' ', '-'),
);
console.log('functions     :', slug('  Kucing Oren '), '| pajak 11% dari 100rb =', tax11(100_000));

const acc = createAccount('hilmi', 100_000);
[25_000, 5_000].forEach(acc.withdraw); // aman dioper sebagai callback, nggak ada `this`
console.log('closure       :', JSON.stringify(acc));

addCat('Oyen');
console.log('module        :', countCats(), 'kucing di store (state module = singleton)');

console.log('prototype     :', makeCat('Mochi').describe());

const lines = [
  { sku: 'KOPI', qty: 10, price: 10_000 },
  { sku: 'ROTI', qty: 1, price: 20_000 },
];
console.log('functional    :', total(lines, [minimumSpend(100_000, 15_000), bulkItem10Percent]));
console.log(
  'union         :',
  totalArea([
    { kind: 'circle', radius: 1 },
    { kind: 'rect', width: 2, height: 3 },
  ]).toFixed(2),
);

console.log('lookup table  :', shippingCost('EXP', 3));
const svc = createCatService({ repo: createInMemoryRepo([{ id: '1', name: 'Oyen' }]), log: console.log });
svc.rename('1', 'Oyen Gendut');

console.log('event loop    :', (await eventLoopOrder()).join(' -> '));
console.log('paralel       :', await parallel([() => sleep(20).then(() => 'a'), () => sleep(20).then(() => 'b')]));

const loudAdd = withLogging(
  'add',
  (a: number, b: number) => a + b,
  (m) => console.log('decorator     :', m),
);
loudAdd(2, 3);

const lru = new LruCache<string, number>(2).set('a', 1).set('b', 2).set('c', 3);
console.log('class (LRU)   :', lru.keys());
