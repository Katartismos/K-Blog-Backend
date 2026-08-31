import { Injectable, Inject, Logger, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import { Readable } from 'stream';
import { CLOUDINARY } from './cloudinary.provider';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(@Inject(CLOUDINARY) private readonly cloudinaryConfig: any) {
    // Explicitly ensure Cloudinary SDK has active configuration
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  /**
   * Upload an in-memory image buffer (Multer file) to Cloudinary via stream.
   * Handles JPG, JPEG, PNG, WEBP with auto-quality/auto-format transformations,
   * and preserves vector paths for SVG.
   */
  async uploadImageBuffer(
    file: Express.Multer.File,
    folder: string = 'blog-posts',
  ): Promise<string> {
    if (!file || !file.buffer) {
      throw new BadRequestException('Image file buffer must be provided');
    }

    const isSvg =
      file.mimetype === 'image/svg+xml' ||
      file.originalname.toLowerCase().endsWith('.svg');

    return new Promise<string>((resolve, reject) => {
      this.logger.log(
        `Streaming image file upload to Cloudinary (folder: ${folder}, type: ${file.mimetype || 'unknown'})`,
      );

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          ...(isSvg
            ? {} // Preserve original vector format without lossy raster transforms
            : {
                transformation: [
                  { quality: 'auto', fetch_format: 'auto' },
                  { width: 1920, crop: 'limit' },
                ],
              }),
        },
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error) {
            this.logger.error(
              'Cloudinary file stream upload failed',
              error.message,
            );
            return reject(
              new BadRequestException(
                `Failed to upload image to Cloudinary: ${error.message}`,
              ),
            );
          }

          if (!result || !result.secure_url) {
            return reject(
              new BadRequestException('Failed to retrieve uploaded image URL'),
            );
          }

          resolve(result.secure_url);
        },
      );

      Readable.from(file.buffer).pipe(uploadStream);
    });
  }

  /**
   * Upload an image (base64 data URI, remote URL, or file path) to Cloudinary
   * with automatic format and quality optimizations.
   */
  async uploadImage(
    fileOrUrl: string,
    folder: string = 'blog-posts',
  ): Promise<string> {
    if (!fileOrUrl) {
      throw new BadRequestException('Image source must be provided');
    }

    // If it is already an optimized Cloudinary URL, ensure optimization flags are included
    if (fileOrUrl.includes('res.cloudinary.com') && !fileOrUrl.startsWith('data:')) {
      return this.ensureOptimizedCloudinaryUrl(fileOrUrl);
    }

    try {
      this.logger.log(`Uploading image to Cloudinary in folder: ${folder}`);

      const result: UploadApiResponse | UploadApiErrorResponse =
        await cloudinary.uploader.upload(fileOrUrl, {
          folder,
          resource_type: 'image',
          transformation: [
            { quality: 'auto', fetch_format: 'auto' },
            { width: 1920, crop: 'limit' },
          ],
        });

      if ('secure_url' in result && result.secure_url) {
        return result.secure_url;
      }

      throw new Error(result.message || 'Failed to upload image to Cloudinary');
    } catch (error) {
      this.logger.error(
        'Cloudinary upload failed',
        error instanceof Error ? error.stack : error,
      );
      throw new BadRequestException(
        `Failed to process image upload: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Universal helper accepting either a Multer file buffer or a URL/data URI string.
   */
  async uploadImageOrBuffer(
    source: string | Express.Multer.File,
    folder: string = 'blog-posts',
  ): Promise<string> {
    if (typeof source === 'string') {
      return this.uploadImage(source, folder);
    }
    return this.uploadImageBuffer(source, folder);
  }

  /**
   * Helper to ensure auto-format and auto-quality parameters are injected
   * into existing Cloudinary delivery URLs.
   */
  ensureOptimizedCloudinaryUrl(url: string): string {
    if (!url.includes('/upload/')) return url;
    if (url.includes('/f_auto,q_auto/')) return url;
    return url.replace('/upload/', '/upload/f_auto,q_auto/');
  }
}
