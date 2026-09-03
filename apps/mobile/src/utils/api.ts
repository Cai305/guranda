import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { startUpload, updateUploadProgress, markUploadFinishing, finishUpload, failUpload } from './uploadStatusStore';
import { getCachedResponse, setCachedResponse } from './apiCache';

const LOCAL_API_BASE_URL = 'http://localhost:3001';
const NGROK_API_BASE_URL = 'https://oppressed-vertical-semicolon.ngrok-free.dev';

/**
 * Resolves the backend URL once when the app bundle starts.
 *
 * - Local Expo/web runs continue to call localhost.
 * - The web app served through an ngrok domain calls the API ngrok tunnel.
 * - EXPO_PUBLIC_API_BASE_URL takes precedence, so a new ngrok tunnel can be
 *   used without another code change:
 *   EXPO_PUBLIC_API_BASE_URL=https://your-api.ngrok-free.dev npm run web
 */
function resolveApiBaseUrl(): string {
  const configuredUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (configuredUrl) return configuredUrl.replace(/\/$/, '');

  if (
    Platform.OS === 'web'
    && typeof window !== 'undefined'
    && window.location.hostname.endsWith('.ngrok-free.dev')
  ) {
    return NGROK_API_BASE_URL;
  }

  return LOCAL_API_BASE_URL;
}

export const API_BASE_URL = resolveApiBaseUrl();

// AuthContext registers a callback here on mount so a 401 (stale/deleted-user
// session, expired token) can clear the in-memory auth state and bounce the
// app to the login screen — clearing storage alone leaves React's `user`
// state (and therefore the authenticated navigator) untouched.
let onUnauthorized: (() => void) | null = null;
export function setOnUnauthorized(callback: (() => void) | null) {
  onUnauthorized = callback;
}

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headersObj = (options.headers as Record<string, string>) || {};
  const bypassCache = headersObj['Cache-Control'] === 'no-cache';

  if (method === 'GET' && !bypassCache) {
    const cachedData = await getCachedResponse(endpoint);
    if (cachedData) {
      return {
        ok: true,
        status: 200,
        json: async () => cachedData,
        text: async () => JSON.stringify(cachedData),
      } as unknown as Response;
    }
  }

  let token = null;
  let userId = null;
  if (Platform.OS === 'web') {
    try {
      token = localStorage.getItem('userToken');
      const raw = localStorage.getItem('userData');
      if (raw) userId = JSON.parse(raw).userId;
    } catch (e) {
      console.error('Local storage unavailable:', e);
    }
  } else {
    token = await SecureStore.getItemAsync('userToken');
    const raw = await SecureStore.getItemAsync('userData');
    if (raw) { try { userId = JSON.parse(raw).userId; } catch {} }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  // Cache-Control is only a signal to this function's own cache above — the
  // API's CORS allowedHeaders doesn't include it, so forwarding it over the
  // wire makes the browser's preflight silently kill the whole request.
  delete headers['Cache-Control'];

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (userId) {
    headers['x-user-id'] = userId;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (method === 'GET' && response.ok && !bypassCache) {
    const cloned = response.clone();
    cloned.json().then(data => {
      setCachedResponse(endpoint, data);
    }).catch(() => {});
  }

  // A 401 with no token attached just means this call was never
  // authenticated in the first place (e.g. a component that fires a request
  // on mount regardless of login state) — that's not a session "expiring",
  // so only treat it as one when a token was actually sent and rejected.
  if (response.status === 401 && token) {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
      } else {
        await SecureStore.deleteItemAsync('userToken');
        await SecureStore.deleteItemAsync('userData');
      }
    } catch (e) {
      console.error('Failed to clear auth storage on 401:', e);
    }
    onUnauthorized?.();
  }

  return response;
}

// fetch() has no way to report upload progress — only XMLHttpRequest does
// (both on web and inside React Native's own networking layer), so this is
// the one place any multipart upload in the app should go through if it
// wants a real percentage rather than an indeterminate spinner.
export function xhrUploadFormData(
  url: string,
  formData: FormData,
  token: string | null,
  onProgress: (percent: number) => void,
  // Fired once every byte has left the device — the request is still open,
  // waiting on the server (Supabase round-trip on our end can take well
  // over a minute for a large video), so callers can swap the "N%" label
  // for a "finishing up" one instead of leaving the UI looking frozen.
  onSent?: () => void,
): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    // Without this, a dropped response (a proxy that silently kills the
    // connection, a server that never replies) leaves the promise pending
    // forever — onload/onerror simply never fire, so nothing left the
    // "uploading" state and the progress UI sat stuck at 100% indefinitely.
    xhr.timeout = 180000;
    let sent = false;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress(percent);
        if (percent >= 100 && !sent) {
          sent = true;
          onSent?.();
        }
      }
    };
    xhr.onload = () => {
      let parsed: any = null;
      try { parsed = JSON.parse(xhr.responseText); } catch {}
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(parsed ?? {});
      } else {
        reject(new Error(parsed?.message || `Upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.ontimeout = () => reject(new Error('Upload timed out. Check your connection and try again.'));
    xhr.onabort = () => reject(new Error('Upload was cancelled'));
    xhr.send(formData);
  });
}

export async function uploadImage(uri: string): Promise<string> {
  const { url } = await uploadMedia(uri, 'image');
  return url;
}

export async function uploadMedia(
  uri: string,
  kind: 'image' | 'video',
  fileInfo?: { name?: string; mimeType?: string },
): Promise<{ url: string, mediaType: 'IMAGE' | 'VIDEO' }>;
export async function uploadMedia(
  uri: string,
  kind: 'audio',
  fileInfo?: { name?: string; mimeType?: string },
): Promise<{ url: string, mediaType: 'AUDIO' }>;
export async function uploadMedia(
  uri: string,
  kind: 'image' | 'video' | 'audio',
  fileInfo?: { name?: string; mimeType?: string },
): Promise<{ url: string, mediaType: 'IMAGE' | 'VIDEO' | 'AUDIO' }> {
  let token: string | null = null;
  if (Platform.OS === 'web') {
    try { token = localStorage.getItem('userToken'); } catch {}
  } else {
    token = await SecureStore.getItemAsync('userToken');
  }

  const isVideo = kind === 'video';
  const isAudio = kind === 'audio';
  const name = fileInfo?.name ?? (isVideo ? 'upload.mp4' : isAudio ? 'upload.mp3' : 'upload.jpg');
  const type = fileInfo?.mimeType ?? (isVideo ? 'video/mp4' : isAudio ? 'audio/mpeg' : 'image/jpeg');

  const formData = new FormData();
  if (Platform.OS === 'web') {
    const blob = await fetch(uri).then(r => r.blob());
    formData.append('file', blob, name);
  } else {
    (formData as any).append('file', { uri, name, type });
  }

  const uploadId = startUpload(
    isVideo ? 'Uploading video…' : isAudio ? 'Uploading audio…' : 'Uploading image…',
  );
  try {
    const data = await xhrUploadFormData(
      `${API_BASE_URL}/upload`,
      formData,
      token,
      (percent) => updateUploadProgress(uploadId, percent),
      () => markUploadFinishing(uploadId),
    );
    if (!data.url) throw new Error('Upload failed');
    const url = /^https?:\/\//.test(data.url) ? data.url : `${API_BASE_URL}${data.url}`;
    const mediaType = data.mediaType === 'VIDEO' ? 'VIDEO' : data.mediaType === 'AUDIO' ? 'AUDIO' : 'IMAGE';
    finishUpload(uploadId, 'Uploaded');
    return { url, mediaType };
  } catch (e) {
    failUpload(uploadId, e instanceof Error ? e.message : 'Upload failed');
    throw e;
  }
}
