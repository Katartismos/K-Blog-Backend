import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import {
  ArcjetModule as NestArcjetModule,
  shield,
  detectBot,
  slidingWindow,
} from '@arcjet/nest';
import { ArcjetService } from './arcjet.service';
import { ArcjetController } from './arcjet.controller';
import { ArcjetGuard } from './arcjet.guard';
import { getRequiredEnv } from './env';

// Selectively load and validate only the required environment variables
const arcjetKey = getRequiredEnv('ARCJET_KEY');
const arcjetEnv = getRequiredEnv('ARCJET_ENV');

@Module({
  imports: [
    NestArcjetModule.forRoot({
      isGlobal: true,
      key: arcjetKey,
      rules: [
        // Web Application Firewall (WAF) to protect against common attacks
        shield({ mode: 'LIVE' }),
        // Bot detection: Block malicious bots but allow search engines
        detectBot({
          mode: 'LIVE',
          allow: ['CATEGORY:SEARCH_ENGINE', 'CATEGORY:PREVIEW'],
        }),
        // Global Rate Limiting policy
        slidingWindow({
          mode: 'LIVE',
          interval: 30,
          max: 10,
        }),
      ],
    }),
  ],
  providers: [ArcjetService, { provide: APP_GUARD, useClass: ArcjetGuard }],
  controllers: [ArcjetController],
  exports: [ArcjetService],
})
export class ArcjetModule {}
