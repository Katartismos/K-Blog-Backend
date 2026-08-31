import { BadRequestException } from '@nestjs/common';
import { ImageValidationPipe } from './image-validation.pipe';

describe('ImageValidationPipe', () => {
  let pipe: ImageValidationPipe;

  beforeEach(() => {
    pipe = new ImageValidationPipe();
  });

  const createMockFile = (
    originalname: string,
    mimetype: string,
    size: number = 1024 * 100,
  ): Express.Multer.File => ({
    fieldname: 'image',
    originalname,
    encoding: '7bit',
    mimetype,
    size,
    buffer: Buffer.from('mock-image-data'),
    stream: null as any,
    destination: '',
    filename: originalname,
    path: '',
  });

  it('should accept valid JPG file', async () => {
    const file = createMockFile('photo.jpg', 'image/jpeg');
    const result = await pipe.transform(file);
    expect(result).toBe(file);
  });

  it('should accept valid PNG file', async () => {
    const file = createMockFile('graphic.png', 'image/png');
    const result = await pipe.transform(file);
    expect(result).toBe(file);
  });

  it('should accept valid WEBP file', async () => {
    const file = createMockFile('banner.webp', 'image/webp');
    const result = await pipe.transform(file);
    expect(result).toBe(file);
  });

  it('should accept valid SVG file', async () => {
    const file = createMockFile('vector.svg', 'image/svg+xml');
    const result = await pipe.transform(file);
    expect(result).toBe(file);
  });

  it('should reject unsupported file formats (e.g. PDF)', async () => {
    const file = createMockFile('document.pdf', 'application/pdf');
    await expect(pipe.transform(file)).rejects.toThrow(BadRequestException);
  });

  it('should reject files exceeding the maximum size limit (5MB)', async () => {
    const file = createMockFile(
      'large-photo.jpg',
      'image/jpeg',
      6 * 1024 * 1024,
    );
    await expect(pipe.transform(file)).rejects.toThrow(BadRequestException);
  });

  it('should throw when file is required but undefined', async () => {
    await expect(pipe.transform(undefined)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should return undefined when file is optional and undefined', async () => {
    const optionalPipe = new ImageValidationPipe({ required: false });
    const result = await optionalPipe.transform(undefined);
    expect(result).toBeUndefined();
  });
});
