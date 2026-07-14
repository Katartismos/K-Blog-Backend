import { Injectable, Inject } from "@nestjs/common";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { DATABASE_CONNECTION } from "../database/database.provider";
import type { Database } from "../database/database.provider";
import * as schema from "../database/schema";

@Injectable()
export class AuthService {
  public auth;

  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {
    this.auth = betterAuth({
      database: drizzleAdapter(this.db, {
        provider: "pg",
        schema: schema,
      }),
      baseURL: process.env.BETTER_AUTH_URL!,
      secret: process.env.BETTER_AUTH_SECRET!,
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
