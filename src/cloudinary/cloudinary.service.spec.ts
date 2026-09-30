import { Test, TestingModule } from '@nestjs/testing';
import { CloudinaryService } from './cloudinary.service';
import { CLOUDINARY } from './cloudinary.provider';
import { v2 as cloudinary } from 'cloudinary';

describe('CloudinaryService', () => {
  let service: CloudinaryService;

  beforeEach(async () => {
    process.env.CLOUDINARY_CLOUD_NAME = 'test_cloud';
    process.env.CLOUDINARY_API_KEY = 'test_key';
    process.env.CLOUDINARY_API_SECRET = 'test_secret';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CloudinaryService,
        {
          provide: CLOUDINARY,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<CloudinaryService>(CloudinaryService);
  });

  describe('generateUploadSignature', () => {
    it('should generate a valid signature and parameters', () => {
      const result = service.generateUploadSignature('blog-posts');

      expect(result).toBeDefined();
      expect(result.cloudName).toBe('test_cloud');
      expect(result.apiKey).toBe('test_key');
      expect(result.folder).toBe('blog-posts');
      expect(typeof result.timestamp).toBe('number');
      expect(typeof result.signature).toBe('string');
      expect(result.signature.length).toBeGreaterThan(0);
    });

    it('should allow custom folder name', () => {
      const result = service.generateUploadSignature('custom-folder');

      expect(result.folder).toBe('custom-folder');
    });
  });

  describe('ensureOptimizedCloudinaryUrl', () => {
    it('should inject f_auto,q_auto,c_limit,w_1920 into standard Cloudinary upload URLs', () => {
      const rawUrl = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
      const optimized = service.ensureOptimizedCloudinaryUrl(rawUrl);

      expect(optimized).toBe('https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_1920/sample.jpg');
    });

    it('should not duplicate flags if already present', () => {
      const alreadyOptimized = 'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/sample.jpg';
      const result = service.ensureOptimizedCloudinaryUrl(alreadyOptimized);

      expect(result).toBe(alreadyOptimized);
    });
  });
});
