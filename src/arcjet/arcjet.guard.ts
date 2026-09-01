import { CanActivate, ExecutionContext, Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ArcjetService } from './arcjet.service';

@Injectable()
export class ArcjetGuard implements CanActivate {
  constructor(private readonly arcjetService: ArcjetService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const req = http.getRequest();

    // Fallback to ensure IP is always defined (e.g. for Render internal health-checks or proxy probes)
    if (!req.ip) {
      const forwarded = req.headers['x-forwarded-for'];
      req.ip =
        (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : undefined) ||
        req.socket?.remoteAddress ||
        '127.0.0.1';
    }

    const decision = await this.arcjetService.protect(req);

    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        throw new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS);
      }
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    return true;
  }
}
