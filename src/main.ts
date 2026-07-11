import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.getHttpAdapter().getInstance().set('trust proxy', true);
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 5000);
}
bootstrap();
