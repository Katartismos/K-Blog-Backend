import { All, Controller, Req, Res } from "@nestjs/common";
import { AuthService } from "./auth.service";
import type { Request, Response } from "express";

@Controller("api/auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @All("{*splat}")
  async handleAuth(@Req() req: Request, @Res() res: Response) {
    const protocol = req.protocol;
    const host = req.get("host");
    const fullUrl = `${protocol}://${host}${req.originalUrl}`;

    const webReq = new Request(fullUrl, {
      method: req.method,
      headers: req.headers as HeadersInit,
      body: ["POST", "PUT", "PATCH"].includes(req.method)
        ? JSON.stringify(req.body)
        : undefined,
    });

    const webRes: globalThis.Response =
      await this.authService.auth.handler(webReq);

    // Convert Web API Response back to Express response payload.
    res.status(webRes.status);
    webRes.headers.forEach((value, key) => res.setHeader(key, value));
    return res.send(await webRes.text());
  }
}
