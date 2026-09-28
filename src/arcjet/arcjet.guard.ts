import { CanActivate, ExecutionContext, Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ArcjetService } from './arcjet.service';

export function resolveClientIp(req: any): string {
  // 1. Framework-resolved req.ip under proxy trust policy
  if (req.ip && typeof req.ip === 'string' && req.ip.trim()) {
    return req.ip.trim();
  }

  // 2. Accept x-real-ip only when attested by deployment platform (e.g., Vercel)
  if (process.env.VERCEL) {
    const xRealIp = req.headers?.['x-real-ip'];
    if (typeof xRealIp === 'string' && xRealIp.trim()) {
      return xRealIp.trim();
    }
    if (Array.isArray(xRealIp) && xRealIp[0]?.trim()) {
      return xRealIp[0].trim();
    }
  }

  // 3. Direct connection remoteAddress
  if (req.socket?.remoteAddress && typeof req.socket.remoteAddress === 'string' && req.socket.remoteAddress.trim()) {
    return req.socket.remoteAddress.trim();
  }

  // 4. Fallback '127.0.0.1'
  return '127.0.0.1';
}

@Injectable()
export class ArcjetGuard implements CanActivate {
  constructor(private readonly arcjetService: ArcjetService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const req = http.getRequest();

    const clientIp = resolveClientIp(req);
    try {
      Object.defineProperty(req, 'ip', {
        value: clientIp,
        configurable: true,
        writable: true,
      });
    } catch {
      throw new HttpException('Unable to determine client IP', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (req.ip !== clientIp) {
      throw new HttpException('Unable to determine client IP', HttpStatus.INTERNAL_SERVER_ERROR);
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


