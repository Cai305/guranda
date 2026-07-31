import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// A "minimized" game/Live/mini-app session — just enough to show a Resume
// banner and jump straight back to where the user was. This intentionally
// does NOT snapshot in-progress gameplay (board state, race position, etc.);
// for online/server-authoritative sessions (Turbo Racing, online Murabaraba,
// Pool, Ludo) the match itself keeps running server-side regardless, so
// resuming the exact route genuinely rejoins it. For local/AI/mini-app
// screens, resuming reopens that screen fresh.
export interface ActiveSession {
  id: string;
  label: string;
  icon: string;
  gradient?: [string, string];
  route: { name: string; params?: any };
}

interface ActiveSessionContextType {
  session: ActiveSession | null;
  minimize: (session: ActiveSession) => void;
  dismiss: () => void;
}

const ActiveSessionContext = createContext<ActiveSessionContextType | null>(null);

const STORAGE_KEY = '@lifeos_minimized_session';

export function ActiveSessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<ActiveSession | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => {
        if (raw) setSession(JSON.parse(raw));
      })
      .catch(() => {});
  }, []);

  const minimize = useCallback((s: ActiveSession) => {
    setSession(s);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(s)).catch(() => {});
  }, []);

  const dismiss = useCallback(() => {
    setSession(null);
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }, []);

  return (
    <ActiveSessionContext.Provider value={{ session, minimize, dismiss }}>
      {children}
    </ActiveSessionContext.Provider>
  );
}

export function useActiveSession() {
  const ctx = useContext(ActiveSessionContext);
  if (!ctx) throw new Error('useActiveSession must be used within an ActiveSessionProvider');
  return ctx;
}
