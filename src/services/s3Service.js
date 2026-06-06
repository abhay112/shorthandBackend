import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger.js';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const bucketName = process.env.AWS_BUCKET_NAME || 'shorthand-tests';

/**
 * Generate a presigned S3 upload URL for direct client-side upload
 * @param {string} fileName - Original filename
 * @param {string} fileType - MIME type of the file
 * @param {string} folder - Destination folder on S3 (e.g. 'audios', 'images')
 * @returns {Promise<{ uploadUrl: string, downloadUrl: string }>}
 */
export const generatePresignedUploadUrl = async (fileName, fileType, folder = 'images') => {
  if (!fileName || !fileType) {
    throw new Error('File name and file type are required for presigned URL');
  }

  const uniqueFileName = `${folder}/${Date.now()}-${fileName}`;
  const uploadParams = {
    Bucket: bucketName,
    Key: uniqueFileName,
    ContentType: fileType,
  };

  const command = new PutObjectCommand(uploadParams);
  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  const downloadUrl = `https://${bucketName}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${uniqueFileName}`;

  return { uploadUrl, downloadUrl };
};

/**
 * Upload a file to S3 from a local path
 * @param {string} localFilePath - Path to the local file
 * @param {string} folder - S3 folder (e.g., 'audios', 'images')
 * @returns {Promise<string>} - The S3 URL of the uploaded file
 */
export const uploadToS3 = async (localFilePath, folder) => {
  if (!localFilePath) return null;

  try {
    const fileStream = fs.createReadStream(localFilePath);
    const fileName = `${folder}/${Date.now()}-${path.basename(localFilePath)}`;

    // Determine ContentType
    let contentType = 'application/octet-stream';
    const ext = path.extname(localFilePath).toLowerCase();
    if (ext === '.mp3') contentType = 'audio/mpeg';
    else if (ext === '.wav') contentType = 'audio/wav';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.svg') contentType = 'image/svg+xml';

    const uploadParams = {
      Bucket: bucketName,
      Key: fileName,
      Body: fileStream,
      ContentType: contentType,
    };

    logger.warn(`Uploading local file ${localFilePath} to S3 bucket ${bucketName}...`);
    await s3Client.send(new PutObjectCommand(uploadParams));
    
    // S3 URL format
    const s3Url = `https://${bucketName}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${fileName}`;
    logger.warn(`Successfully uploaded to S3: ${s3Url}`);
    
    // Cleanup local file after successful upload
    fs.unlink(localFilePath, (err) => {
      if (err) {
        logger.error(`Error deleting local file ${localFilePath}: ${err.message}`);
      } else {
        logger.warn(`Local file ${localFilePath} cleaned up.`);
      }
    });

    return s3Url;
  } catch (err) {
    logger.error(`Error uploading file to S3: ${err.message}`);
    // If upload fails, keep local file for debugging or fallback, but throw error
    throw err;
  }
};

/**
 * Delete a file from S3 given its URL
 * @param {string} s3Url - The S3 URL of the file to delete
 */
export const deleteFromS3 = async (s3Url) => {
  if (!s3Url) return;

  try {
    // Extract the key from the URL
    // Format: https://bucket-name.s3.region.amazonaws.com/key
    const urlPattern = new RegExp(`https://${bucketName}\\.s3\\.[a-z0-9-]+\\.amazonaws\\.com/(.+)`);
    const match = s3Url.match(urlPattern);
    if (!match) return;

    const key = match[1];

    const deleteParams = {
      Bucket: bucketName,
      Key: key,
    };

    logger.warn(`Deleting object ${key} from S3 bucket ${bucketName}...`);
    await s3Client.send(new DeleteObjectCommand(deleteParams));
    logger.warn(`Successfully deleted object from S3`);
  } catch (err) {
    logger.error(`Error deleting file from S3: ${err.message}`);
  }
};
