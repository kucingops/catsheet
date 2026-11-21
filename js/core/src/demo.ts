// Jalankan: `npm run demo` atau `node src/demo.ts` (Node 26 bisa langsung eksekusi TypeScript lewat type stripping).
import { BankAccount } from './01-encapsulation.ts';
import { Circle, Rectangle, totalArea } from './03-polymorphism.ts';
import { BankTransferProcessor, InMemoryNotifier } from './04-abstraction.ts';
import { ShippingFactory } from './08-design-patterns.ts';
import { eventLoopOrder } from './09-async-and-closure.ts';

const acc = BankAccount.open('hilmi', 100_000);
acc.withdraw(25_000);
console.log('encapsulation :', JSON.stringify(acc));

console.log('polymorphism  :', totalArea([new Circle(1), new Rectangle(2, 3)]).toFixed(2));

const notifier = new InMemoryNotifier();
new BankTransferProcessor(notifier).pay(50_000);
console.log('abstraction   :', notifier.messages[0]);

console.log('strategy      :', ShippingFactory.create('EXP').cost(3));
console.log('event loop    :', (await eventLoopOrder()).join(' -> '));
