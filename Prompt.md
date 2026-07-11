Act as a Senior Backend Architect and Better Auth expert. Your task is to implement the complete authentication layer within a NestJS application using Better Auth (v1).

This setup must connect seamlessly with the database connection provider (`DATABASE_CONNECTION`) and the Drizzle schema definitions (`src/database/schema/index.ts`) created in the previous setup phase. This backend architecture must explicitly handle our pluralized table structures ('users', 'sessions', 'accounts', 'verifications') and expose a clean interface compatible with a Next.js frontend SPA client.

### Technical Context & Environment

- Framework: NestJS (Express runtime)
- Database/ORM: Neon Postgres via Drizzle ORM
- Auth Engine: Better Auth (v1)
- Auth Adapter: `@better-auth/drizzle-adapter` (using `drizzleAdapter`)
- Provider: Google OAuth
- Core Strategy: Support pluralized PostgreSQL tables cleanly without naming mismatches.
- Expected Environment Variables to use:
  - `BETTER_AUTH_SECRET`
  - `BETTER_AUTH_URL` (e.g., http://localhost:3000/api/auth)
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`

Please generate completely implemented code files without shortcuts or placeholders for the following structural layout:

---

### 1. FILE: src/auth/auth.service.ts

- Create a NestJS injectable `AuthService` that initializes the core Better Auth engine.
- Inject the Drizzle database instance using the custom `@Inject(DATABASE_CONNECTION)` token.
- Import `betterAuth` from `better-auth` and `drizzleAdapter` from `@better-auth/drizzle-adapter`.
- In the `betterAuth` configuration object, initialize the database parameter using `drizzleAdapter(db, { provider: 'pg', usePlural: true, schema })`, passing the injected Drizzle instance along with your aggregated database schema object (`* as schema`). The `usePlural: true` flag is mandatory to ensure the engine correctly identifies the 'users', 'sessions', 'accounts', and 'verifications' tables.
- Configure the `google` provider under `socialProviders`, mapping client credentials to your environment variables.
- Export the initialized Better Auth engine instance as a public property (e.g., `this.auth`) so downstream route controllers and guards can interact with its API lifecycle directly.

---

### 2. FILE: src/auth/auth.controller.ts

- Create an `AuthController` mapped to the base controller path `api/auth`.
- Implement a wildcard catch-all route handler using `@All('*')` to intercept all essential authentication sub-paths (e.g., `/api/auth/sign-in`, `/api/auth/callback/google`, `/api/auth/get-session`).
- Better Auth expects standard Web API `Request` and `Response` elements. Because NestJS targets an Express runtime environment by default, implement a bulletproof adapter loop inside this handler. It must convert the incoming Express `Req` object into a native Web API `Request` structure, pass it cleanly to Better Auth's engine router handler, and then securely translate the resulting Web API `Response` headers, cookies, and JSON payloads back out to the client via the Express `Res` object.

---

### 3. FILE: src/auth/guards/auth.guard.ts

- Implement a custom NestJS `AuthGuard` that implements the standard `CanActivate` interface.
- The guard must extract the incoming headers and cookies from the execution context.
- Use the provided `AuthService` instance to check the request's validity against Better Auth's database-backed session verifier (e.g., `auth.api.getSession({ headers })`).
- If a valid session is returned from the verification look-up, attach the verified `user` and `session` payloads directly to the NestJS request wrapper (making it safely accessible in downstream route controllers via `req.user`) and return `true`.
- If the session token is invalid, expired, or absent, throw an explicit NestJS `UnauthorizedException`.

---

### 4. FILE: src/auth/auth.module.ts

- Define the structural `AuthModule`.
- Import the `DatabaseModule` so the global database connection injection token resolves properly.
- Declare the `AuthController` and provide the `AuthService` along with the custom `AuthGuard`.
- Export both `AuthService` and `AuthGuard` globally within your ecosystem so your upcoming `PostsModule` can use the guard out of the box to protect creative blogging endpoints.

Ensure all file definitions feature strong TypeScript typing, robust error catching, and conform perfectly to NestJS architectural guidelines. Do not leave truncated code blocks or empty methods.
