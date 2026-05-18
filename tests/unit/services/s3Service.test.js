import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Setup mock for S3 Client
const mockSend = jest.fn();
jest.unstable_mockModule('@aws-sdk/client-s3', () => {
  return {
    S3Client: jest.fn().mockImplementation(() => ({
      send: mockSend,
    })),
    PutObjectCommand: jest.fn().mockImplementation((params) => ({ type: 'PutObjectCommand', ...params })),
    DeleteObjectCommand: jest.fn().mockImplementation((params) => ({ type: 'DeleteObjectCommand', ...params })),
  };
});

// Mock fs module but preserve other properties like existsSync
jest.unstable_mockModule('fs', () => {
  const actualFs = jest.requireActual('fs');
  return {
    ...actualFs,
    default: {
      ...actualFs,
      createReadStream: jest.fn().mockReturnValue('mock-stream'),
      unlink: jest.fn().mockImplementation((path, cb) => cb(null)),
    }
  };
});

// Import using await import
const { uploadToS3, deleteFromS3 } = await import('../../../src/services/s3Service.js');

describe('s3Service', () => {
  beforeEach(() => {
    mockSend.mockClear();
    process.env.AWS_BUCKET_NAME = 'shorthand-tests';
    process.env.AWS_REGION = 'ap-south-1';
  });

  describe('uploadToS3', () => {
    it('should successfully upload file to S3 and delete local file', async () => {
      mockSend.mockResolvedValue({});
      
      const s3Url = await uploadToS3('dummy/path/to/testImage.png', 'images');
      
      expect(s3Url).toContain('shorthand-tests.s3.ap-south-1.amazonaws.com/images/');
      expect(s3Url).toContain('testImage.png');
      expect(mockSend).toHaveBeenCalled();
    });

    it('should return null if no file path is provided', async () => {
      const s3Url = await uploadToS3(null, 'images');
      expect(s3Url).toBeNull();
      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  describe('deleteFromS3', () => {
    it('should call S3 delete for a valid S3 URL', async () => {
      mockSend.mockResolvedValue({});
      
      const s3Url = 'https://shorthand-tests.s3.ap-south-1.amazonaws.com/images/12345-image.png';
      await deleteFromS3(s3Url);
      
      expect(mockSend).toHaveBeenCalled();
    });

    it('should not call S3 delete for an invalid or non-matching S3 URL', async () => {
      const s3Url = 'https://other-bucket.s3.amazonaws.com/images/12345-image.png';
      await deleteFromS3(s3Url);
      
      expect(mockSend).not.toHaveBeenCalled();
    });
  });
});
