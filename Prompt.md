Act as a Senior Backend Architect and Drizzle ORM expert. Your task is to generate the entire database connection, configuration, and relational schema layer for a NestJS application connecting to a Neon PostgreSQL database.

This database must concurrently support the production requirements of Better Auth (v1) and a migrated blog application originally built on MongoDB.

### Technical Stack & Requirements

- Framework: NestJS
- ORM: Drizzle ORM (`drizzle-orm`, `drizzle-kit`)
- Database Connection Client: `@neondatabase/serverless` (using connection pooling via `Pool`)
- Target Database: Neon PostgreSQL
- Node/TypeScript environment with strict typing.

Please generate the code for the following exact file layout:

---

### 1. FILE: drizzle.config.ts (Root Directory)

Configure the Drizzle Kit file to locate schemas under `src/database/schema/index.ts` and output migrations to a `./drizzle` root directory. Use the `postgresql` dialect and pull the connection string via `process.env.DATABASE_URL`.

---

### 2. FILE: src/database/database.provider.ts & database.module.ts

- Implement a NestJS provider that initializes a connection pool using `@neondatabase/serverless`.
- Instantiate the Drizzle client, passing the pool instance and injecting the centralized schema object (`* as schema`).
- Export a global `DATABASE_CONNECTION` token so the Drizzle instance can be cleanly injected into modules via `@Inject(DATABASE_CONNECTION)`.

---

### 3. FILE: src/database/schema/auth.ts

Define the exact table schemas required by Better Auth. Use snake_case for PostgreSQL physical table/column naming rules, but camelCase for the JavaScript object exports.

Create the following four tables:

- **users**:
  - `id`: text, primary key.
  - `name`: text, required.
  - `email`: text, required, unique.
  - `emailVerified`: boolean, required.
  - `image`: text, optional.
  - `createdAt`: timestamp, defaults to now.
  - `updatedAt`: timestamp, defaults to now.
- **sessions**:
  - `id`: text, primary key.
  - `userId`: text, foreign key referencing `users.id` with `onDelete: 'cascade'`.
  - `token`: text, required, unique.
  - `expiresAt`: timestamp, required.
  - `ipAddress`: text, optional.
  - `userAgent`: text, optional.
  - `createdAt`: timestamp, defaults to now.
  - `updatedAt`: timestamp, defaults to now.
- **accounts**:
  - `id`: text, primary key.
  - `userId`: text, foreign key referencing `users.id` with `onDelete: 'cascade'`.
  - `accountId`: text, required.
  - `providerId`: text, required (e.g., 'google').
  - `accessToken`: text, optional.
  - `refreshToken`: text, optional.
  - `idToken`: text, optional.
  - `expiresAt`: timestamp, optional.
  - `password`: text, optional.
  - `createdAt`: timestamp, defaults to now.
  - `updatedAt`: timestamp, defaults to now.
- **verifications**:
  - `id`: text, primary key.
  - `identifier`: text, required.
  - `value`: text, required.
  - `expiresAt`: timestamp, required.
  - `createdAt`: timestamp, defaults to now.
  - `updatedAt`: timestamp, defaults to now.

---

### 4. FILE: src/database/schema/posts.ts

Define the business schema for the blog posts, migrating it away from a loose document structure to a strict relational model.

Create the **posts** table with the following properties:

- `id`: uuid, primary key, auto-generated (`uuidv4`).
- `userId`: text, foreign key referencing `users.id` with `onDelete: 'set null'`. This cleanly tracks the true author instead of storing decoupled redundant profile strings.
- `slug`: text, required, unique. Include a database-level index on this column since it handles core SEO query routing.
- `title`: text, required.
- `content`: text, required (holds the rich-text Tiptap editor HTML layout strings).
- `excerpt`: text, required.
- `category`: text, required. Enforce a PostgreSQL `text` column but add documentation/comments that values must match our system types: 'TECHNOLOGY', 'TRAVEL', 'FOODS', 'LIFESTYLE', 'FINANCE', or 'GAMING'.
- `categoryColor`: text, required (maps to the UI tailwind badge design string, defaulting to 'bg-gray-600').
- `imageUrl`: text, required (stores the verified Cloudinary asset destination delivery path).
- `readTime`: text, required (metadata calculating read duration).
- `createdAt`: timestamp, defaults to now.
- `updatedAt`: timestamp, defaults to now.

Set up explicit Drizzle relationships (`relations`) linking the `posts` table back to the `users` table so we can write clean relational queries later (`db.query.posts.findMany({ with: { author: true } })`).

---

### 5. FILE: src/database/schema/index.ts

Create a clean barrel export file that spreads and exports all content from both `auth.ts` and `posts.ts` seamlessly. This will act as the single source of truth passed to your Drizzle client initialization configuration.

Ensure all outputs use pristine TypeScript types, separate physical column naming configuration smoothly, and adhere to NestJS structural standards. Provide completely implemented files without using placeholders or ellipses.
