import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchApi } from '../utils/api';

interface StoreContextType {
  installedApps: string[];
  installApp: (appId: string) => Promise<void>;
  uninstallApp: (appId: string) => Promise<void>;
  isInstalled: (appId: string) => boolean;
}

const CACHE_KEY = '@mxit_installed_apps';

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [installedApps, setInstalledApps] = useState<string[]>([]);

  useEffect(() => {
    loadInstalledApps();
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
    <StoreContext.Provider value={{ installedApps, installApp, uninstallApp, isInstalled }}>
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
