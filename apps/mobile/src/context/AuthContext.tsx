import React, { createContext, useState, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform, AppState } from 'react-native';
import { API_BASE_URL, setOnUnauthorized } from '../utils/api';
import { clearApiCache } from '../utils/apiCache';
import { syncPushToken, registerNotificationResponseHandler } from '../utils/pushNotifications';
import { registerIntegrationsDeepLinkHandler } from '../utils/integrationsDeepLink';
import { registerCommunityDeepLinkHandler } from '../utils/communityDeepLink';
import { syncLocation } from '../utils/locationSync';
import { rideSocket } from '../services/RideSocketService';

const LOCATION_REFRESH_MS = 5 * 60 * 1000;

const setStorageItemAsync = async (key: string, value: string) => {
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.error('Local storage is unavailable:', e);
    }
  } else {
    await SecureStore.setItemAsync(key, value);
  }
};

const getStorageItemAsync = async (key: string) => {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.error('Local storage is unavailable:', e);
      return null;
    }
  } else {
    return await SecureStore.getItemAsync(key);
  }
};

const deleteStorageItemAsync = async (key: string) => {
  if (Platform.OS === 'web') {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error('Local storage is unavailable:', e);
    }
  } else {
    await SecureStore.deleteItemAsync(key);
  }
};

export type UserStatus = 'online' | 'away' | 'busy';

export interface AuthUser {
  userId: string;
  username: string;
  displayName?: string;
  xrplAddress?: string;
  avatarUrl?: string;
  bio?: string;
  statusMessage?: string;
  autoStatusEnabled?: boolean;
  effectiveStatus?: string | null;
  // Opt-in: reveals what this user is doing right now (watching a live
  // stream, viewing a story) to others as their presence label, instead of
  // just a generic "Busy" dot. Off by default.
  shareLiveActivity?: boolean;
  relationshipStatus?: string | null;
  subscribers?: number;
  reputation?: number;
  level?: string;
}

export type VerificationStatus = 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';

interface AuthContextType {
  isAuthenticated: boolean;
  isReady: boolean;
  user: AuthUser | null;
  token: string | null;
  status: UserStatus;
  login: (user: AuthUser, token: string) => Promise<void>;
  logout: () => Promise<void>;
  updateStatus: (newStatus: UserStatus) => void;
  refreshProfile: () => Promise<void>;
  verificationStatus: VerificationStatus | null;
  isVerified: boolean;
  refreshVerification: () => Promise<void>;
  // Set when the server rejects the stored token/session (expired, or the
  // account no longer exists) — LoginScreen reads this to explain why the
  // user landed back here instead of just showing an empty form.
  sessionExpired: boolean;
  clearSessionExpired: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isReady: false,
  user: null,
  token: null,
  status: 'online',
  login: async () => {},
  logout: async () => {},
  updateStatus: () => {},
  refreshProfile: async () => {},
  verificationStatus: null,
  isVerified: false,
  refreshVerification: async () => {},
  sessionExpired: false,
  clearSessionExpired: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<UserStatus>('online');
  const [isReady, setIsReady] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const storedToken = await getStorageItemAsync('userToken');
        const storedUser = await getStorageItemAsync('userData');
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (e) {
        console.error('Failed to load session', e);
      } finally {
        setIsReady(true);
      }
    };
    loadSession();
  }, []);

  const login = async (userData: AuthUser, authToken: string) => {
    setUser(userData);
    setToken(authToken);
    setStatus('online');
    await setStorageItemAsync('userToken', authToken);
    await setStorageItemAsync('userData', JSON.stringify(userData));
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    setVerificationStatus(null);
    await deleteStorageItemAsync('userToken');
    await deleteStorageItemAsync('userData');
    await clearApiCache();
    rideSocket.disconnect();
  };

  const clearSessionExpired = () => setSessionExpired(false);

  // Shared by the fetchApi 401 hook below and by refreshProfile/
  // refreshVerification's own raw `fetch` calls (they predate fetchApi's
  // 401 handling and don't go through it) — clears in-memory state so
  // RootNavigator's `isAuthenticated` flips to Login, instead of leaving the
  // user stuck on a screen whose every request now 401s.
  const expireSession = () => {
    setUser(null);
    setToken(null);
    setVerificationStatus(null);
    setSessionExpired(true);
    clearApiCache();
    rideSocket.disconnect();
  };

  // fetchApi has already cleared storage by the time this fires (see
  // utils/api.ts).
  useEffect(() => {
    setOnUnauthorized(expireSession);
    return () => setOnUnauthorized(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateStatus = (newStatus: UserStatus) => {
    setStatus(newStatus);
  };

  // Pull the Guranda profile (avatar, display name, bio) so every surface —
  // home header, MoonBase, chats — shows the same identity.
  const refreshProfile = async () => {
    try {
      const authToken = token || (await getStorageItemAsync('userToken'));
      if (!authToken) return;
      const res = await fetch(`${API_BASE_URL}/users/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.status === 401) { expireSession(); return; }
      if (!res.ok) return;
      const p = await res.json();
      if (!p) return;
      setUser(prev => {
        if (!prev) return prev;
        const next = {
          ...prev,
          avatarUrl: p.avatarUrl ?? prev.avatarUrl,
          displayName: p.displayName ?? prev.displayName,
          bio: p.bio ?? prev.bio,
          statusMessage: p.statusMessage ?? prev.statusMessage,
          autoStatusEnabled: p.autoStatusEnabled ?? prev.autoStatusEnabled,
          effectiveStatus: p.effectiveStatus ?? null,
          shareLiveActivity: p.shareLiveActivity ?? prev.shareLiveActivity,
          relationshipStatus: p.relationshipStatus ?? null,
          subscribers: p.subscribers ?? prev.subscribers,
          reputation: p.reputation ?? prev.reputation,
          level: p.level ?? prev.level,
        };
        setStorageItemAsync('userData', JSON.stringify(next)).catch(() => {});
        return next;
      });
    } catch {}
  };

  // Pulls the account's verification status — gates wallet sends and
  // creator-fund flows (rental listings, etc). Refetch after submitting
  // verification docs or once an admin approves/rejects.
  const refreshVerification = async () => {
    try {
      const authToken = token || (await getStorageItemAsync('userToken'));
      if (!authToken) return;
      const res = await fetch(`${API_BASE_URL}/verification/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.status === 401) { expireSession(); return; }
      if (!res.ok) { setVerificationStatus(null); return; }
      const v = await res.json();
      setVerificationStatus(v?.status ?? null);
    } catch {}
  };

  // Refresh once whenever a session becomes active
  useEffect(() => {
    if (token && user) {
      refreshProfile();
      refreshVerification();
      syncPushToken();
      registerNotificationResponseHandler();
      registerIntegrationsDeepLinkHandler();
      registerCommunityDeepLinkHandler();
      syncLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Keep the AI companion's location fix fresh for as long as the app is
  // open — a periodic tick while foregrounded plus an immediate refresh on
  // every foreground resume, since a stale fix from hours ago is worse than
  // no fix at all. Not background/OS-level tracking (no ACCESS_BACKGROUND_
  // LOCATION) — only ever while the app itself is running.
  //
  // Also re-checks verification on every foreground resume: verification is
  // approved/rejected by an admin out-of-band, so a session that was open
  // (or just cached) from before that happened would otherwise keep showing
  // "Verify my account" on Deposit/Send forever, even though the account is
  // actually verified now — this is the one place besides initial login that
  // refreshes it.
  useEffect(() => {
    if (!token || !user) return;
    const interval = setInterval(() => syncLocation(), LOCATION_REFRESH_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        syncLocation();
        refreshVerification();
      }
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user]);

  return (
    <AuthContext.Provider value={{
      isAuthenticated: !!user, isReady, user, token, status, login, logout, updateStatus, refreshProfile,
      verificationStatus, isVerified: verificationStatus === 'VERIFIED', refreshVerification,
      sessionExpired, clearSessionExpired,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
