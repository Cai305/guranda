import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

// AES-256-GCM at-rest encryption for real third-party credentials (external
// OAuth access/refresh tokens — see integrations/). Deliberately lazy: the
// key is only resolved when a secret is actually encrypted/decrypted, not at
// module load, so a deploy with no INTEGRATIONS_ENCRYPTION_KEY set yet (true
// today — the OAuth apps themselves haven't been created) doesn't crash the
// whole API on boot. Callers must check isEncryptionConfigured() first and
// fail that one request gracefully, the same way travel.service.ts/
// gif.service.ts degrade when their own third-party API keys are unset.
function resolveKey(): Buffer {
  const secret = process.env.INTEGRATIONS_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error('INTEGRATIONS_ENCRYPTION_KEY is not set.');
  }
  return scryptSync(secret, 'guranda-integrations', 32);
}

export function isEncryptionConfigured(): boolean {
  return !!process.env.INTEGRATIONS_ENCRYPTION_KEY;
}

export function encryptSecret(plain: string): string {
  const key = resolveKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString('base64');
}

export function decryptSecret(encoded: string): string {
  const key = resolveKey();
  const raw = Buffer.from(encoded, 'base64');
  const iv = raw.subarray(0, 12);
  const authTag = raw.subarray(12, 28);
  const ciphertext = raw.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
