import { loadEnvFile } from "node:process";

try {
  loadEnvFile();
} catch (error) {}

import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.getHttpAdapter().getInstance().set("trust proxy", true);
  app.enableShutdownHooks();
  app.enableCors({
    origin: [process.env.FRONTEND_URL ?? "http://localhost:3000"],
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  });

  await app.listen(process.env.PORT ?? 5000);
}
bootstrap();
