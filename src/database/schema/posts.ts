import { pgTable, text, uuid, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './auth';

export const posts = pgTable(
  'posts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    content: text('content').notNull(),
    excerpt: text('excerpt').notNull(),
    /**
     * Must match system category types:
     * 'TECHNOLOGY', 'TRAVEL', 'FOODS', 'LIFESTYLE', 'FINANCE', or 'GAMING'
     */
    category: text('category').notNull(),
    categoryColor: text('category_color').notNull().default('bg-gray-600'),
    imageUrl: text('image_url').notNull(),
    readTime: text('read_time').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('posts_slug_idx').on(table.slug)],
);

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(user, {
    fields: [posts.userId],
    references: [user.id],
  }),
}));
