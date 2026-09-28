import { CanActivate, ExecutionContext, Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ArcjetService } from './arcjet.service';

function resolveClientIp(req: any): string {
  // 1. req.headers['x-real-ip']
  const xRealIp = req.headers?.['x-real-ip'];
  if (typeof xRealIp === 'string' && xRealIp.trim()) {
    return xRealIp.trim();
  }
  if (Array.isArray(xRealIp) && xRealIp[0]?.trim()) {
    return xRealIp[0].trim();
  }

  // 2. First IP in req.headers['x-forwarded-for'] (split by comma and trimmed)
  const forwarded = req.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    const firstIp = forwarded.split(',')[0].trim();
    if (firstIp) return firstIp;
  }
  if (Array.isArray(forwarded) && forwarded[0]?.trim()) {
    const firstIp = forwarded[0].split(',')[0].trim();
    if (firstIp) return firstIp;
  }

  // 3. req.ip
  if (req.ip && typeof req.ip === 'string' && req.ip.trim()) {
    return req.ip.trim();
  }

  // 4. req.socket?.remoteAddress
  if (req.socket?.remoteAddress && typeof req.socket.remoteAddress === 'string' && req.socket.remoteAddress.trim()) {
    return req.socket.remoteAddress.trim();
  }

  // 5. Fallback '127.0.0.1'
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
      // In case property cannot be redefined, ipSrc ensures Arcjet receives the client IP
    }

    const decision = await this.arcjetService.protect(req, { ipSrc: clientIp });


    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        throw new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS);
      }
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    return true;
  }
}

