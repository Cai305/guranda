import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../utils/api';

// Admin-controlled, per-module access — set from the Guranda Landing
// website's admin dashboard. ALL: everyone; VERIFIED_ONLY: only verified
// accounts; OFF: nobody, module shows as under construction.
export type FeatureAccess = 'ALL' | 'VERIFIED_ONLY' | 'OFF';

interface FeatureFlagsContextType {
  flags: Record<string, FeatureAccess>;
  loaded: boolean;
  refreshFlags: () => Promise<void>;
  // Resolves a module key against the current user's verification state.
  effectiveAccess: (key: string, isVerified: boolean) => 'open' | 'locked' | 'off';
}

const FeatureFlagsContext = createContext<FeatureFlagsContextType>({
  flags: {},
  loaded: false,
  refreshFlags: async () => {},
  effectiveAccess: () => 'open',
});

export function FeatureFlagsProvider({ children }: { children: React.ReactNode }) {
  const [flags, setFlags] = useState<Record<string, FeatureAccess>>({});
  const [loaded, setLoaded] = useState(false);

  const refreshFlags = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/feature-flags`);
      if (!res.ok) return;
      const data = await res.json();
      setFlags(data ?? {});
    } catch {}
    finally { setLoaded(true); }
  }, []);

  useEffect(() => { refreshFlags(); }, [refreshFlags]);

  const effectiveAccess = useCallback((key: string, isVerified: boolean): 'open' | 'locked' | 'off' => {
    const access = flags[key] ?? 'ALL';
    if (access === 'OFF') return 'off';
    if (access === 'VERIFIED_ONLY' && !isVerified) return 'locked';
    return 'open';
  }, [flags]);

  return (
    <FeatureFlagsContext.Provider value={{ flags, loaded, refreshFlags, effectiveAccess }}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export const useFeatureFlags = () => useContext(FeatureFlagsContext);
