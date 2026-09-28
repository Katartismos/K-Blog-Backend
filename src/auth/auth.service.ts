import { Injectable, Inject } from "@nestjs/common";
import { DATABASE_CONNECTION } from "../database/database.provider";
import type { Database } from "../database/database.provider";
import * as schema from "../database/schema";
import type { Request, Response } from "express";

export const BETTER_AUTH = Symbol("BETTER_AUTH");

export const authInstanceProvider = {
  provide: BETTER_AUTH,
  inject: [DATABASE_CONNECTION],
  useFactory: async (db: Database) => {
    // Dynamic ESM imports prevent require() errors in CommonJS on Vercel
    const [{ betterAuth }, { bearer }, { drizzleAdapter }] = await Promise.all([
      import("better-auth"),
      import("better-auth/plugins"),
      import("better-auth/adapters/drizzle"),
    ]);

    const baseURL =
      process.env.BETTER_AUTH_URL ||
      process.env.FRONTEND_URL ||
      (process.env.NODE_ENV === "production"
        ? "https://k-blog-app.vercel.app"
        : "http://localhost:3000");

    const trustedOrigins = Array.from(
      new Set([
        "http://localhost:3000",
        "http://localhost:5000",
        "https://k-blog-app.vercel.app",
        baseURL.replace(/\/$/, ""),
        ...(process.env.FRONTEND_URL
          ? process.env.FRONTEND_URL.split(",").map((s) => s.trim().replace(/\/$/, ""))
          : []),
      ]),
    );

    return betterAuth({
      database: drizzleAdapter(db, {
        provider: "pg",
        schema: schema,
      }),
      baseURL,
      secret: process.env.BETTER_AUTH_SECRET!,
      trustedOrigins,
      plugins: [bearer()],
      emailAndPassword: {
        enabled: true,
      },
      socialProviders: {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        },
      },
      user: {
        additionalFields: {
          role: {
            type: "string",
            defaultValue: "user",
            input: false,
          },
        },
      },
    });
  },
};

@Injectable()
export class AuthService {
  constructor(@Inject(BETTER_AUTH) public readonly auth: any) {}

  async handleAuth(req: Request, res: Response) {
    const { toNodeHandler } = await import("better-auth/node");
    return toNodeHandler(this.auth)(req, res);
  }
}

