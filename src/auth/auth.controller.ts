import { All, Controller, Req, Res, Logger } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { toNodeHandler } from "better-auth/node";
import type { Request, Response } from "express";

@Controller("api/auth")
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @All("{*splat}")
  async handleAuth(@Req() req: Request, @Res() res: Response) {
    try {
      return await toNodeHandler(this.authService.auth)(req, res);
    } catch (error) {
      this.logger.error("Better Auth handler error:", error);
      if (!res.headersSent) {
        res.status(500).json({
          message: error instanceof Error ? error.message : "Internal Server Error",
        });
      }
    }
  }
}
