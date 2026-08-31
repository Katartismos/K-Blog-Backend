import {
  Injectable,
  Inject,
  Logger,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE_CONNECTION, type Database } from '../database/database.provider';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { posts } from '../database/schema/posts';
import { CreatePostDto, CATEGORY_COLORS } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  private async generateUniqueSlug(
    title: string,
    customSlug?: string,
  ): Promise<string> {
    const base = (customSlug || title)
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const baseSlug = base || 'post';

    const [existing] = await this.db
      .select({ id: posts.id })
      .from(posts)
      .where(eq(posts.slug, baseSlug))
      .limit(1);

    if (!existing) {
      return baseSlug;
    }

    const uniqueSuffix = Math.random().toString(36).substring(2, 7);
    return `${baseSlug}-${uniqueSuffix}`;
  }

  async uploadPostImage(file: Express.Multer.File): Promise<string> {
    return this.cloudinaryService.uploadImageBuffer(file, 'blog-posts');
  }

  async create(
    createPostDto: CreatePostDto,
    userId?: string,
    file?: Express.Multer.File,
  ) {
    try {
      this.logger.log(`Creating post with title: "${createPostDto.title}"`);

      // 1. Validate image source presence
      if (!file && !createPostDto.imageUrl) {
        throw new BadRequestException('An image file or imageUrl must be provided');
      }

      // 2. Derive category color automatically
      const categoryColor =
        CATEGORY_COLORS[createPostDto.category] ?? 'bg-gray-600';

      // 3. Generate unique slug
      const slug = await this.generateUniqueSlug(
        createPostDto.title,
        createPostDto.slug,
      );

      // 4. Extract plain text for excerpt & readTime fallback
      const plainText = (createPostDto.content || '')
        .replace(/<[^>]+>/g, ' ')
        .trim();
      const words = plainText.split(/\s+/).filter(Boolean).length;

      // 5. Derive excerpt
      const excerpt =
        createPostDto.excerpt ||
        (plainText.length > 160
          ? `${plainText.substring(0, 157)}...`
          : plainText || createPostDto.title);

      // 6. Derive read time
      const readTime =
        createPostDto.readTime ||
        `${Math.max(1, Math.ceil(words / 200))}-min read`;

      // 7. Upload & optimize image (buffer if file uploaded, else URL/base64)
      const optimizedImageUrl = file
        ? await this.cloudinaryService.uploadImageBuffer(file, 'blog-posts')
        : await this.cloudinaryService.uploadImage(createPostDto.imageUrl!);

      // 8. Persist post into database
      const [newPost] = await this.db
        .insert(posts)
        .values({
          title: createPostDto.title,
          slug,
          content: createPostDto.content,
          excerpt,
          category: createPostDto.category,
          categoryColor,
          imageUrl: optimizedImageUrl,
          readTime,
          userId: userId ?? null,
        })
        .returning();

      this.logger.log(`Successfully created post with ID: ${newPost.id}`);
      return newPost;
    } catch (error) {
      this.logger.error(
        'Failed to create post',
        error instanceof Error ? error.stack : error,
      );
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to create post');
    }
  }

  async findAll() {
    try {
      this.logger.log('Fetching all posts');
      const allPosts = await this.db.query.posts.findMany({
        orderBy: (posts, { desc }) => [desc(posts.createdAt)],
        with: {
          author: {
            columns: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      });

      return allPosts;
    } catch (error) {
      this.logger.error(
        'Failed to fetch posts',
        error instanceof Error ? error.stack : error,
      );
      throw new InternalServerErrorException('Failed to retrieve posts');
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} post`;
  }

  update(id: number, updatePostDto: UpdatePostDto) {
    return `This action updates a #${id} post`;
  }

  remove(id: number) {
    return `This action removes a #${id} post`;
  }
}
