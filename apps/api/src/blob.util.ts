import { put, del } from '@vercel/blob';
import { extname } from 'path';
import * as crypto from 'crypto';

/**
 * Upload a multer file buffer to Vercel Blob.
 * @param folder  e.g. 'images', 'videos'
 * @param file    multer file with buffer (memoryStorage required)
 * @returns public CDN URL
 */
export async function uploadToBlob(
  folder: string,
  file: Express.Multer.File,
): Promise<string> {
  const ext = extname(file.originalname) || '';
  const name = `${folder}/${crypto.randomBytes(16).toString('hex')}${ext}`;
  const { url } = await put(name, file.buffer, {
    access: 'public',
    contentType: file.mimetype,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  return url;
}

/**
 * Delete a previously uploaded file from Vercel Blob by its URL.
 */
export async function deleteFromBlob(url: string): Promise<void> {
  try {
    await del(url, { token: process.env.BLOB_READ_WRITE_TOKEN });
  } catch {
    // non-fatal — file may already be gone
  }
}
