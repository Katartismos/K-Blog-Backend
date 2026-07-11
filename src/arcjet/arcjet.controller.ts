import { Controller, Get, UseGuards } from '@nestjs/common';
import { ArcjetGuard } from './arcjet.guard';

@Controller('arcjet')
export class ArcjetController {
  @Get('test-rate-limit')
  @UseGuards(ArcjetGuard)
  testRateLimit() {
    return {
      message: 'Request allowed',
    };
  }
}
