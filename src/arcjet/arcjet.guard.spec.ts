import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { ArcjetGuard, resolveClientIp } from './arcjet.guard';
import { ArcjetService } from './arcjet.service';

describe('ArcjetGuard & resolveClientIp', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('resolveClientIp', () => {
    it('prioritizes framework-resolved req.ip over caller-controlled x-real-ip', () => {
      const req = {
        ip: '198.51.100.1',
        headers: {
          'x-real-ip': '203.0.113.199',
        },
      };

      const resolved = resolveClientIp(req);
      expect(resolved).toBe('198.51.100.1');
    });

    it('ignores caller-controlled x-real-ip when platform does not attest it (VERCEL not set)', () => {
      delete process.env.VERCEL;
      const req = {
        headers: {
          'x-real-ip': '203.0.113.199',
        },
        socket: {
          remoteAddress: '192.168.1.50',
        },
      };

      const resolved = resolveClientIp(req);
      expect(resolved).toBe('192.168.1.50');
    });

    it('accepts x-real-ip when platform attests it (VERCEL set) and req.ip is not available', () => {
      process.env.VERCEL = '1';
      const req = {
        headers: {
          'x-real-ip': '203.0.113.199',
        },
        socket: {
          remoteAddress: '192.168.1.50',
        },
      };

      const resolved = resolveClientIp(req);
      expect(resolved).toBe('203.0.113.199');
    });

    it('falls back to socket remoteAddress when req.ip is missing and platform does not attest x-real-ip', () => {
      delete process.env.VERCEL;
      const req = {
        socket: {
          remoteAddress: '10.0.0.1',
        },
      };

      const resolved = resolveClientIp(req);
      expect(resolved).toBe('10.0.0.1');
    });

    it('falls back to 127.0.0.1 when no IP source is available', () => {
      delete process.env.VERCEL;
      const req = {};

      const resolved = resolveClientIp(req);
      expect(resolved).toBe('127.0.0.1');
    });
  });

  describe('ArcjetGuard.canActivate', () => {
    let mockArcjetService: Partial<ArcjetService>;
    let guard: ArcjetGuard;

    beforeEach(() => {
      mockArcjetService = {
        protect: jest.fn().mockResolvedValue({
          isDenied: () => false,
          reason: { isRateLimit: () => false },
        }),
      };
      guard = new ArcjetGuard(mockArcjetService as ArcjetService);
    });

    function createMockContext(req: any): ExecutionContext {
      return {
        switchToHttp: () => ({
          getRequest: () => req,
          getResponse: () => ({}),
          getNext: () => ({}),
        }),
      } as unknown as ExecutionContext;
    }

    it('applies clientIp to req.ip and calls protect without ipSrc option', async () => {
      const req: any = {
        ip: '198.51.100.5',
      };
      const context = createMockContext(req);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(req.ip).toBe('198.51.100.5');
      // Verify protect was called with req and without ipSrc
      expect(mockArcjetService.protect).toHaveBeenCalledWith(req);
      expect(mockArcjetService.protect).not.toHaveBeenCalledWith(req, expect.objectContaining({ ipSrc: expect.anything() }));
    });

    it('explicitly handles failed req.ip assignment by throwing HttpException instead of protecting unchanged request', async () => {
      // Create a frozen object where defining property 'ip' fails
      const req: any = {};
      Object.defineProperty(req, 'ip', {
        value: undefined,
        writable: false,
        configurable: false,
      });

      const context = createMockContext(req);

      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
      await expect(guard.canActivate(context)).rejects.toMatchObject({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      });

      // Arcjet protect must NOT be called on unchanged request
      expect(mockArcjetService.protect).not.toHaveBeenCalled();
    });

    it('throws 429 when decision is denied with rate limit', async () => {
      mockArcjetService.protect = jest.fn().mockResolvedValue({
        isDenied: () => true,
        reason: { isRateLimit: () => true },
      });

      const req: any = { ip: '1.2.3.4' };
      const context = createMockContext(req);

      await expect(guard.canActivate(context)).rejects.toThrow(
        new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS),
      );
    });

    it('throws 403 when decision is denied with non-rate-limit reason', async () => {
      mockArcjetService.protect = jest.fn().mockResolvedValue({
        isDenied: () => true,
        reason: { isRateLimit: () => false },
      });

      const req: any = { ip: '1.2.3.4' };
      const context = createMockContext(req);

      await expect(guard.canActivate(context)).rejects.toThrow(
        new HttpException('Forbidden', HttpStatus.FORBIDDEN),
      );
    });
  });
});
