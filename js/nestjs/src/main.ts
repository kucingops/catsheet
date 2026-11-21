import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './configure-app.js';
import { parseDriver } from './persistence/persistence-driver.js';

async function bootstrap() {
  const driver = parseDriver(process.env.PERSISTENCE);
  const app = await NestFactory.create(
    AppModule.register({ driver, filePath: process.env.DATA_FILE, database: process.env.DATABASE }),
  );
  configureApp(app);
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  Logger.log(`jalan di http://localhost:${port} (persistence=${driver})`, 'Bootstrap');
}
await bootstrap();
