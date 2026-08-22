import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

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
   * Helper to ensure auto-format and auto-quality parameters are injected
   * into existing Cloudinary delivery URLs.
   */
  ensureOptimizedCloudinaryUrl(url: string): string {
    if (!url.includes('/upload/')) return url;
    if (url.includes('/f_auto,q_auto/')) return url;
    return url.replace('/upload/', '/upload/f_auto,q_auto/');
  }
}
