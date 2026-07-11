import { Inject, Injectable } from '@nestjs/common';
import { ARCJET } from '@arcjet/nest';
import type { ArcjetNest } from '@arcjet/nest';

@Injectable()
export class ArcjetService {
  constructor(@Inject(ARCJET) private readonly arcjet: ArcjetNest) {}

  /**
   * Run the configured Arcjet protection on the given request.
   * Allows manual calls from controllers, guards, or other services.
   * Defaults to requesting 1 token for rate-limit rules.
   */
  async protect(request: any, customRules?: Parameters<ArcjetNest['protect']>[1]) {
    const options = { requested: 1, ...customRules };
    return this.arcjet.protect(request, options);
  }
}
