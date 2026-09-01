import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchApi } from '../utils/api';

export interface CommunityAppEntry {
  id: string;
  name: string;
  icon: string;
  color: string;
  description?: string;
  sourceUrl: string;
  isGame: boolean;
}

interface StoreContextType {
  installedApps: string[];
  installApp: (appId: string) => Promise<void>;
  uninstallApp: (appId: string) => Promise<void>;
  isInstalled: (appId: string) => boolean;
  // Third-party apps/games published via Profile > Developer Hub — fetched
  // once here so every screen that needs to resolve an installed app's
  // name/icon/route (Home, Hub/Store, Games) shares one fetch instead of
  // each re-implementing its own, which is how community apps ended up
  // installable but invisible everywhere except the Store's own list.
  communityApps: CommunityAppEntry[];
}

const CACHE_KEY = '@mxit_installed_apps';

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [installedApps, setInstalledApps] = useState<string[]>([]);
  const [communityApps, setCommunityApps] = useState<CommunityAppEntry[]>([]);

  useEffect(() => {
    loadInstalledApps();
    fetchApi('/store/apps')
      .then(res => (res.ok ? res.json() : []))
      .then((apps: any[]) => {
        if (!Array.isArray(apps)) return;
        setCommunityApps(
          apps
            .filter(a => !a.isNative && a.sourceUrl)
            .map(a => ({
              id: a.id,
              name: a.name,
              icon: a.iconUrl || 'apps',
              color: a.color || '#3A86FF',
              description: a.description,
              sourceUrl: a.sourceUrl,
              isGame: a.type === 'Game',
            })),
        );
      })
      .catch(() => {});
  }, []);

  // Server is the source of truth (so AI-driven installs show up here too) —
  // the AsyncStorage copy is just an offline fallback if the request fails.
  const loadInstalledApps = async () => {
    try {
      const res = await fetchApi('/store/installed');
      if (res.ok) {
        const server: string[] = await res.json();
        setInstalledApps(server);
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(server));
        return;
      }
    } catch {
      // offline or logged out — fall back to the local cache below
    }
    try {
      const stored = await AsyncStorage.getItem(CACHE_KEY);
      setInstalledApps(stored ? JSON.parse(stored) : []);
    } catch (e) {
      console.error('Failed to load installed apps', e);
    }
  };

  const installApp = async (appId: string) => {
    if (installedApps.includes(appId)) return;
    const newApps = [...installedApps, appId];
    setInstalledApps(newApps);
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(newApps));
    } catch (e) {
      console.error('Failed to cache installed app', e);
    }
    try {
      await fetchApi(`/store/installed/${appId}`, { method: 'POST' });
    } catch (e) {
      console.error('Failed to sync install to server', e);
    }
  };

  const uninstallApp = async (appId: string) => {
    const newApps = installedApps.filter(id => id !== appId);
    setInstalledApps(newApps);
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(newApps));
    } catch (e) {
      console.error('Failed to cache uninstalled app', e);
    }
    try {
      await fetchApi(`/store/installed/${appId}`, { method: 'DELETE' });
    } catch (e) {
      console.error('Failed to sync uninstall to server', e);
    }
  };

  const isInstalled = (appId: string) => {
    return installedApps.includes(appId);
  };

  return (
    <StoreContext.Provider value={{ installedApps, installApp, uninstallApp, isInstalled, communityApps }}>
      {children}
    </StoreContext.Provider>
  );
}

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
