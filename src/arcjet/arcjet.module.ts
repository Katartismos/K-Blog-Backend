import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ArcjetService } from "./arcjet.service";
import { ArcjetController } from "./arcjet.controller";
import { ArcjetGuard } from "./arcjet.guard";
import { ARCJET } from "./arcjet.constants";

export const arcjetProvider = {
  provide: ARCJET,
  useFactory: async () => {
    // Dynamic ESM import prevents CommonJS require() errors on Vercel serverless
    const { ArcjetModule: NestArcjetModule, shield, detectBot, slidingWindow } =
      await import("@arcjet/nest");

    const dynamicModule = NestArcjetModule.forRoot({
      isGlobal: true,
      key: process.env.ARCJET_KEY || "",
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
    });

    const optionsProvider = dynamicModule.providers?.find(
      (p: any) => typeof p === "object" && p !== null && "useValue" in p,
    ) as any;
    const arcjetFactoryProvider = dynamicModule.providers?.find(
      (p: any) => typeof p === "object" && p !== null && "useFactory" in p,
    ) as any;

    return arcjetFactoryProvider.useFactory(optionsProvider.useValue);
  },
};


@Module({
  providers: [
    arcjetProvider,
    ArcjetService,
    { provide: APP_GUARD, useClass: ArcjetGuard },
  ],
  controllers: [ArcjetController],
  exports: [ArcjetService],
})
export class ArcjetModule {}

