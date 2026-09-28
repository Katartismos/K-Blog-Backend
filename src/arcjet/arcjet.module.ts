import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import {
  ArcjetModule as NestArcjetModule,
  shield,
  detectBot,
  slidingWindow,
} from "@arcjet/nest";
import { ArcjetService } from "./arcjet.service";
import { ArcjetController } from "./arcjet.controller";
import { ArcjetGuard } from "./arcjet.guard";

@Module({
  imports: [
    NestArcjetModule.forRootAsync({
      isGlobal: true,
      useFactory: () => ({
        key: process.env.ARCJET_KEY!,
        rules: [
          // Web Application Firewall (WAF) to protect against common attacks
          shield({ mode: "LIVE" }),
          // Bot detection: Block malicious bots but allow search engines
          detectBot({
            mode: "LIVE",
            allow: ["CATEGORY:SEARCH_ENGINE", "CATEGORY:PREVIEW"],
          }),
          // Global Rate Limiting policy
          slidingWindow({
            mode: "LIVE",
            interval: 30,
            max: 10,
          }),
        ],
      }),
    }),
  ],
  providers: [ArcjetService, { provide: APP_GUARD, useClass: ArcjetGuard }],
  controllers: [ArcjetController],
  exports: [ArcjetService],
})
export class ArcjetModule {}
