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

  const allowedOrigins = Array.from(
    new Set([
      "http://localhost:3000",
      "http://localhost:5000",
      "https://k-blog-app.vercel.app",
      ...(process.env.FRONTEND_URL
        ? process.env.FRONTEND_URL.split(",").map((s) => s.trim().replace(/\/$/, ""))
        : []),
    ]),
  );

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-side fetch)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || origin.endsWith(".vercel.app")) {
        return callback(null, true);
      }
      return callback(new Error(`CORS origin not allowed: ${origin}`), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  });

  await app.listen(process.env.PORT ?? 5000);
}
bootstrap();
