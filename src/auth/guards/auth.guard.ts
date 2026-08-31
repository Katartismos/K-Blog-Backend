import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from '../auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const headers = new Headers();
    Object.entries(request.headers).forEach(([key, value]) => {
      if (value) {
        if (Array.isArray(value)) {
          value.forEach((v) => headers.append(key, v));
        } else {
          headers.append(key, value);
        }
      }
    });

    // If Authorization Bearer header is present and no cookie header exists, also set cookie header as fallback
    const authHeader = request.headers['authorization'];
    if (authHeader && typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')) {
      const token = authHeader.substring(7).trim();
      if (!headers.has('cookie') && token) {
        headers.append('cookie', `better-auth.session_token=${token}`);
      }
    }

    try {
      const session = await this.authService.auth.api.getSession({
        headers,
      });

      if (!session || !session.user) {
        this.logger.warn('Authentication failed: No active session found for provided credentials');
        throw new UnauthorizedException('Authentication required');
      }

      // Attach user and session to Express Request
      (request as any).user = session.user;
      (request as any).session = session.session;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Session retrieval error:', error);
      throw new UnauthorizedException('Invalid or expired authentication session');
    }
  }
}
