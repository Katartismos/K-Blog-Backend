import {
  Injectable,
  Inject,
  Logger,
  InternalServerErrorException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { eq, and, ne, or } from "drizzle-orm";
import {
  DATABASE_CONNECTION,
  type Database,
} from "../database/database.provider";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { posts } from "../database/schema/posts";
import { CreatePostDto, CATEGORY_COLORS } from "./dto/create-post.dto";
import { UpdatePostDto } from "./dto/update-post.dto";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
    excludePostId?: string,
  ): Promise<string> {
    const base = (customSlug || title)
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const baseSlug = base || "post";

    const conditions = [eq(posts.slug, baseSlug)];
    if (excludePostId) {
      conditions.push(ne(posts.id, excludePostId));
    }

    const [existing] = await this.db
      .select({ id: posts.id })
      .from(posts)
      .where(and(...conditions))
      .limit(1);

    if (!existing) {
      return baseSlug;
    }

    const uniqueSuffix = Math.random().toString(36).substring(2, 7);
    return `${baseSlug}-${uniqueSuffix}`;
  }

  async uploadPostImage(file: Express.Multer.File): Promise<string> {
    return this.cloudinaryService.uploadImageBuffer(file, "blog-posts");
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
        throw new BadRequestException(
          "An image file or imageUrl must be provided",
        );
      }

      // 2. Derive category color automatically
      const categoryColor =
        CATEGORY_COLORS[createPostDto.category] ?? "bg-gray-600";

      // 3. Generate unique slug
      const slug = await this.generateUniqueSlug(
        createPostDto.title,
        createPostDto.slug,
      );

      // 4. Extract plain text for excerpt & readTime fallback
      const plainText = (createPostDto.content || "")
        .replace(/<[^>]+>/g, " ")
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
        ? await this.cloudinaryService.uploadImageBuffer(file, "blog-posts")
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
        "Failed to create post",
        error instanceof Error ? error.stack : error,
      );
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException("Failed to create post");
    }
  }

  async findAll() {
    try {
      this.logger.log("Fetching all posts");
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
        "Failed to fetch posts",
        error instanceof Error ? error.stack : error,
      );
      throw new InternalServerErrorException("Failed to retrieve posts");
    }
  }

  async findOne(idOrSlug: string) {
    try {
      this.logger.log(`Fetching post with identifier: "${idOrSlug}"`);
      const isUuid = UUID_REGEX.test(idOrSlug);

      const post = await this.db.query.posts.findFirst({
        where: isUuid
          ? or(eq(posts.id, idOrSlug), eq(posts.slug, idOrSlug))
          : eq(posts.slug, idOrSlug),
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

      if (!post) {
        throw new NotFoundException(
          `Post not found with identifier "${idOrSlug}"`,
        );
      }

      return post;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to fetch post "${idOrSlug}"`,
        error instanceof Error ? error.stack : error,
      );
      throw new InternalServerErrorException("Failed to retrieve post");
    }
  }

  async update(
    idOrSlug: string,
    updatePostDto: UpdatePostDto,
    userId?: string,
    file?: Express.Multer.File,
  ) {
    try {
      this.logger.log(`Updating post with identifier: "${idOrSlug}"`);
      const existingPost = await this.findOne(idOrSlug);

      // Ownership authorization check
      if (!userId || existingPost.userId !== userId) {
        throw new ForbiddenException(
          "You are not authorized to update this post",
        );
      }

      // Handle image upload if a new file or image URL is provided
      let imageUrl = existingPost.imageUrl;
      if (file) {
        imageUrl = await this.cloudinaryService.uploadImageBuffer(
          file,
          "blog-posts",
        );
      } else if (
        updatePostDto.imageUrl &&
        updatePostDto.imageUrl !== existingPost.imageUrl
      ) {
        imageUrl = await this.cloudinaryService.uploadImage(
          updatePostDto.imageUrl,
        );
      }

      // Slug handling: if title or custom slug is updated
      let slug = existingPost.slug;
      if (
        (updatePostDto.title && updatePostDto.title !== existingPost.title) ||
        (updatePostDto.slug && updatePostDto.slug !== existingPost.slug)
      ) {
        slug = await this.generateUniqueSlug(
          updatePostDto.title || existingPost.title,
          updatePostDto.slug,
          existingPost.id,
        );
      }

      // Category and Category Color
      const category = updatePostDto.category ?? existingPost.category;
      const categoryColor =
        updatePostDto.category && CATEGORY_COLORS[updatePostDto.category]
          ? CATEGORY_COLORS[updatePostDto.category]
          : existingPost.categoryColor;

      // Plain text, excerpt & readTime calculation if content changed
      const content = updatePostDto.content ?? existingPost.content;
      let excerpt = updatePostDto.excerpt ?? existingPost.excerpt;
      let readTime = updatePostDto.readTime ?? existingPost.readTime;

      if (updatePostDto.content && !updatePostDto.excerpt) {
        const plainText = content.replace(/<[^>]+>/g, " ").trim();
        excerpt =
          plainText.length > 160
            ? `${plainText.substring(0, 157)}...`
            : plainText || updatePostDto.title || existingPost.title;
      }

      if (updatePostDto.content && !updatePostDto.readTime) {
        const plainText = content.replace(/<[^>]+>/g, " ").trim();
        const words = plainText.split(/\s+/).filter(Boolean).length;
        readTime = `${Math.max(1, Math.ceil(words / 200))}-min read`;
      }

      const [updatedPost] = await this.db
        .update(posts)
        .set({
          title: updatePostDto.title ?? existingPost.title,
          slug,
          content,
          excerpt,
          category,
          categoryColor,
          imageUrl,
          readTime,
          updatedAt: new Date(),
        })
        .where(eq(posts.id, existingPost.id))
        .returning();

      this.logger.log(`Successfully updated post with ID: ${updatedPost.id}`);
      return updatedPost;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to update post "${idOrSlug}"`,
        error instanceof Error ? error.stack : error,
      );
      throw new InternalServerErrorException("Failed to update post");
    }
  }

  async remove(idOrSlug: string, userId?: string) {
    try {
      this.logger.log(`Deleting post with identifier: "${idOrSlug}"`);
      const existingPost = await this.findOne(idOrSlug);

      // Ownership authorization check
      if (!userId || existingPost.userId !== userId) {
        throw new ForbiddenException(
          "You are not authorized to delete this post",
        );
      }

      await this.db.delete(posts).where(eq(posts.id, existingPost.id));

      this.logger.log(`Successfully deleted post with ID: ${existingPost.id}`);
      return {
        message: "Post deleted successfully",
        id: existingPost.id,
        slug: existingPost.slug,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to delete post "${idOrSlug}"`,
        error instanceof Error ? error.stack : error,
      );
      throw new InternalServerErrorException("Failed to delete post");
    }
  }
}
