import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import {
  AESEncryptionKey,
  AESSealedData,
  AESKeySize,
  aesEncryptAsync,
  aesDecryptAsync,
} from 'expo-crypto';

// Encrypted local key/value store — on Android, AsyncStorage's own default
// implementation is already backed by SQLite, so this gives every screen
// that reads through it a real local database, not just an in-memory cache.
//
// The encryption key is a real AES-256 key (native AES-GCM via expo-crypto,
// backed by the OS's own crypto — CryptoKit/Keystore, not a JS re-implementation),
// generated once per install and kept only in the device's hardware-backed
// Keychain/Keystore (expo-secure-store) — the same place auth tokens already
// live. It never touches app code, never gets logged, and isn't derived from
// anything guessable, so nothing other than this specific Guranda install can
// ever decrypt what's written here — not another app on the device, not a
// plain file-system dump of AsyncStorage's on-disk SQLite database.
//
// This is deliberately a CACHE, not a source of truth: if the key is ever
// missing (fresh install, or the OS clears Keystore on uninstall), every
// existing entry just fails to decrypt and is treated as a miss — callers
// re-fetch from the server rather than losing real data.

const KEY_STORAGE_NAME = 'guranda_secure_local_db_key_v1';
const STORE_PREFIX = '@secure_db_';

// Fallback only for JS environments missing the (now-standard) global —
// costs nothing when TextEncoder/TextDecoder are already present, which is
// the case on any current Hermes/React Native or browser runtime.
let TextEncoderImpl: typeof TextEncoder = (globalThis as any).TextEncoder;
let TextDecoderImpl: typeof TextDecoder = (globalThis as any).TextDecoder;
if (!TextEncoderImpl || !TextDecoderImpl) {
  try {
    const polyfill = require('text-encoding');
    TextEncoderImpl = TextEncoderImpl || polyfill.TextEncoder;
    TextDecoderImpl = TextDecoderImpl || polyfill.TextDecoder;
  } catch {
    // If even the polyfill is unavailable, encrypt/decrypt below will throw
    // and every call site here already treats that as a cache miss.
  }
}

let cachedKey: AESEncryptionKey | null = null;
let keyPromise: Promise<AESEncryptionKey> | null = null;

async function readKeyMaterial(): Promise<string | null> {
  // expo-secure-store has no web implementation — localStorage is the only
  // real option there, matching how the rest of the app already branches
  // (see utils/api.ts's own web/native SecureStore split). Web's security
  // model is fundamentally different anyway (no OS keychain to lean on), so
  // this only ever changes the "at rest on disk" guarantee on native.
  if (Platform.OS === 'web') {
    try { return localStorage.getItem(KEY_STORAGE_NAME); } catch { return null; }
  }
  try { return await SecureStore.getItemAsync(KEY_STORAGE_NAME); } catch { return null; }
}

async function writeKeyMaterial(value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try { localStorage.setItem(KEY_STORAGE_NAME, value); } catch {}
    return;
  }
  try { await SecureStore.setItemAsync(KEY_STORAGE_NAME, value); } catch {}
}

async function getOrCreateKey(): Promise<AESEncryptionKey> {
  if (cachedKey) return cachedKey;
  if (keyPromise) return keyPromise;
  keyPromise = (async () => {
    const existing = await readKeyMaterial();
    if (existing) {
      try {
        cachedKey = await AESEncryptionKey.import(existing, 'base64');
        return cachedKey;
      } catch {
        // Corrupted/unreadable stored key — fall through and mint a fresh
        // one rather than leaving the local db permanently unusable.
      }
    }
    const key = await AESEncryptionKey.generate(AESKeySize.AES256);
    const encoded = await key.encoded('base64');
    await writeKeyMaterial(encoded);
    cachedKey = key;
    return key;
  })();
  return keyPromise;
}

async function encryptString(plaintext: string): Promise<string> {
  const bytes = new TextEncoderImpl().encode(plaintext);
  return encryptBytes(bytes);
}

async function decryptString(combinedBase64: string): Promise<string | null> {
  const bytes = await decryptBytes(combinedBase64);
  if (!bytes) return null;
  try {
    return new TextDecoderImpl().decode(bytes);
  } catch {
    return null;
  }
}

/**
 * Encrypts raw bytes with the same install-specific hardware-backed key as
 * every string entry in this store, returning a combined (nonce+ciphertext+
 * tag) base64 blob safe to write to disk as-is. Exported for mediaCache.ts —
 * image/video bytes are encrypted+decrypted directly rather than round-
 * tripped through JSON/string storage, but they still belong to the exact
 * same "only this install can ever decrypt this" key model as everything
 * else in this file, so this shares that key instead of minting a second one.
 */
export async function encryptBytes(bytes: Uint8Array): Promise<string> {
  const key = await getOrCreateKey();
  const sealed = await aesEncryptAsync(bytes, key);
  return sealed.combined('base64');
}

/** Inverse of encryptBytes. Returns null on any decrypt failure — always a safe cache miss, never a crash. */
export async function decryptBytes(combinedBase64: string): Promise<Uint8Array | null> {
  try {
    const key = await getOrCreateKey();
    const sealed = AESSealedData.fromCombined(combinedBase64);
    return (await aesDecryptAsync(sealed, key, { output: 'bytes' })) as Uint8Array;
  } catch {
    // Wrong/rotated key, corrupted entry, or a value written before this
    // store existed — always a safe-to-refetch cache miss, never a crash.
    return null;
  }
}

/** Encrypts `value` (any JSON-serializable data) and persists it under `key`. */
export async function secureSet(key: string, value: unknown): Promise<void> {
  try {
    const encrypted = await encryptString(JSON.stringify(value));
    await AsyncStorage.setItem(STORE_PREFIX + key, encrypted);
  } catch (e) {
    console.warn('secureLocalDb: failed to write', key, e);
  }
}

/** Reads and decrypts the value stored under `key`, or null if missing/unreadable. */
export async function secureGet<T = any>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(STORE_PREFIX + key);
    if (!raw) return null;
    const json = await decryptString(raw);
    if (!json) return null;
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export async function secureRemove(key: string): Promise<void> {
  try { await AsyncStorage.removeItem(STORE_PREFIX + key); } catch {}
}

/** Removes every entry whose key starts with `prefix` — for scoping a clear to one feature's namespace (e.g. just the API cache) instead of the whole store. */
export async function clearSecureKeysWithPrefix(prefix: string): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const ours = keys.filter(k => k.startsWith(STORE_PREFIX + prefix));
    if (ours.length) await AsyncStorage.multiRemove(ours);
  } catch {}
}

/** Removes every entry this store owns. */
export async function clearSecureStore(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const ours = keys.filter(k => k.startsWith(STORE_PREFIX));
    if (ours.length) await AsyncStorage.multiRemove(ours);
  } catch {}
}
