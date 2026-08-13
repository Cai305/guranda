import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = '@api_cache_';
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

export async function getCachedResponse(endpoint: string): Promise<any | null> {
  try {
    const key = `${CACHE_PREFIX}${endpoint}`;
    const cachedStr = await AsyncStorage.getItem(key);
    if (!cachedStr) return null;
    
    const cached = JSON.parse(cachedStr);
    if (Date.now() - cached.timestamp > DEFAULT_TTL) {
      // Expired, clean it up asynchronously
      AsyncStorage.removeItem(key).catch(() => {});
      return null;
    }
    
    return cached.data;
  } catch {
    return null;
  }
}

export async function setCachedResponse(endpoint: string, data: any): Promise<void> {
  try {
    const key = `${CACHE_PREFIX}${endpoint}`;
    const payload = JSON.stringify({
      timestamp: Date.now(),
      data,
    });
    await AsyncStorage.setItem(key, payload);
  } catch {
    // Ignore storage errors (e.g. quota exceeded)
  }
}

export async function clearApiCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }
  } catch {
    // Ignore errors
  }
}
