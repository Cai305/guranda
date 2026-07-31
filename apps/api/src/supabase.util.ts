import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { extname } from 'path';
import * as crypto from 'crypto';

const BUCKET = 'media';

let client: SupabaseClient | null = null;
let bucketReady: Promise<void> | null = null;

function getClient(): SupabaseClient {
  if (!client) {
    client = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!,
      { auth: { persistSession: false } },
    );
  }
  return client;
}

// Buckets aren't provisioned by migrations here, so make sure the one we
// upload into actually exists the first time it's needed instead of failing
// every upload with "Bucket not found". Memoized so this only runs once per
// process, and tolerant of a race where another request creates it first.
function ensureBucket(): Promise<void> {
  if (!bucketReady) {
    bucketReady = getClient()
      .storage.createBucket(BUCKET, { public: true })
      .then(({ error }) => {
        if (error && !/already exists/i.test(error.message)) throw error;
      });
  }
  return bucketReady;
}

/**
 * Upload a multer file buffer to Supabase Storage.
 * @param folder  e.g. 'images', 'videos'
 * @param file    multer file with buffer (memoryStorage required)
 * @returns public CDN URL
 */
export async function uploadToSupabase(
  folder: string,
  file: Express.Multer.File,
): Promise<string> {
  await ensureBucket();
  const ext = extname(file.originalname) || '';
  const path = `${folder}/${crypto.randomBytes(16).toString('hex')}${ext}`;

  const { error } = await getClient()
    .storage.from(BUCKET)
    .upload(path, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });
  if (error) throw error;

  const { data } = getClient().storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Delete a previously uploaded file from Supabase Storage by its public URL.
 */
export async function deleteFromSupabase(url: string): Promise<void> {
  try {
    const marker = `/object/public/${BUCKET}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) return;
    const path = url.slice(idx + marker.length);
    await getClient().storage.from(BUCKET).remove([path]);
  } catch {
    // non-fatal — file may already be gone
  }
}
