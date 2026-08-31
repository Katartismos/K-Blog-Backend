import {
  PipeTransform,
  Injectable,
  BadRequestException,
} from '@nestjs/common';

export interface ImageValidationOptions {
  maxSizeBytes?: number;
  required?: boolean;
}

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
];

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.svg'];

const DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5 MB

@Injectable()
export class ImageValidationPipe implements PipeTransform<Express.Multer.File | undefined, Promise<Express.Multer.File | undefined>> {
  constructor(private readonly options: ImageValidationOptions = {}) {}

  async transform(file?: Express.Multer.File): Promise<Express.Multer.File | undefined> {
    const isRequired = this.options.required ?? true;

    if (!file) {
      if (isRequired) {
        throw new BadRequestException('Image file is required');
      }
      return undefined;
    }

    // 1. Validate File Size
    const maxSize = this.options.maxSizeBytes ?? DEFAULT_MAX_SIZE;
    if (file.size > maxSize) {
      const maxSizeMb = (maxSize / (1024 * 1024)).toFixed(1);
      throw new BadRequestException(
        `File size exceeds the allowed limit of ${maxSizeMb}MB`,
      );
    }

    // 2. Validate MIME Type & Extension
    const mimeType = file.mimetype?.toLowerCase();
    const originalName = file.originalname?.toLowerCase() || '';
    const hasValidExt = ALLOWED_EXTENSIONS.some((ext) =>
      originalName.endsWith(ext),
    );
    const hasValidMime = ALLOWED_MIME_TYPES.includes(mimeType);

    if (!hasValidMime && !hasValidExt) {
      throw new BadRequestException(
        'Unsupported image format. Allowed formats are JPG, JPEG, PNG, WEBP, and SVG.',
      );
    }

    return file;
  }
}
