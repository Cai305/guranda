import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TAB_BAR_STYLES, DEFAULT_TAB_BAR_STYLE, TabBarStyleId } from '../config/tabBarStyles';

const STORAGE_KEY = '@mxit_tabbar_style_id';

interface TabBarStyleContextType {
  styleId: TabBarStyleId;
  isReady: boolean;
  setStyleId: (id: TabBarStyleId) => void;
  availableStyles: typeof TAB_BAR_STYLES;
}

const TabBarStyleContext = createContext<TabBarStyleContextType>({
  styleId: DEFAULT_TAB_BAR_STYLE,
  isReady: false,
  setStyleId: () => {},
  availableStyles: TAB_BAR_STYLES,
});

export function TabBarStyleProvider({ children }: { children: React.ReactNode }) {
  const [styleId, setStyleIdState] = useState<TabBarStyleId>(DEFAULT_TAB_BAR_STYLE);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored && TAB_BAR_STYLES.some(s => s.id === stored)) {
          setStyleIdState(stored as TabBarStyleId);
        }
      } catch (e) {
        console.error('Failed to load tab bar style preference', e);
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  const setStyleId = useCallback((id: TabBarStyleId) => {
    setStyleIdState(id);
    AsyncStorage.setItem(STORAGE_KEY, id).catch(e => console.error('Failed to save tab bar style preference', e));
  }, []);

  return (
    <TabBarStyleContext.Provider value={{ styleId, isReady, setStyleId, availableStyles: TAB_BAR_STYLES }}>
      {children}
    </TabBarStyleContext.Provider>
  );
}

export const useTabBarStyle = () => useContext(TabBarStyleContext);
