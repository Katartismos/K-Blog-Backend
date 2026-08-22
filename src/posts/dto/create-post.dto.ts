export const POST_CATEGORIES = [
  'TECHNOLOGY',
  'TRAVEL',
  'FOODS',
  'LIFESTYLE',
  'FINANCE',
  'GAMING',
] as const;

export type PostCategory = (typeof POST_CATEGORIES)[number];

export const CATEGORY_COLORS: Record<PostCategory, string> = {
  TECHNOLOGY: 'bg-indigo-600',
  TRAVEL: 'bg-sky-500',
  FOODS: 'bg-orange-600',
  LIFESTYLE: 'bg-lime-600',
  FINANCE: 'bg-emerald-600',
  GAMING: 'bg-violet-600',
};

export class CreatePostDto {
  title: string;
  content: string;
  category: PostCategory;
  imageUrl: string;
  excerpt?: string;
  readTime?: string;
  slug?: string;
}
