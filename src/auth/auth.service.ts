import { Injectable, Inject } from "@nestjs/common";
import { betterAuth } from "better-auth";
import { bearer } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { DATABASE_CONNECTION } from "../database/database.provider";
import type { Database } from "../database/database.provider";
import * as schema from "../database/schema";

@Injectable()
export class AuthService {
  public auth;

  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {
    const trustedOrigins = Array.from(
      new Set([
        "http://localhost:3000",
        "http://localhost:5000",
        "https://k-blog-app.vercel.app",
        ...(process.env.FRONTEND_URL
          ? process.env.FRONTEND_URL.split(",").map((s) => s.trim().replace(/\/$/, ""))
          : []),
      ]),
    );

    this.auth = betterAuth({
      database: drizzleAdapter(this.db, {
        provider: "pg",
        schema: schema,
      }),
      baseURL: process.env.BETTER_AUTH_URL!,
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
  }
}
