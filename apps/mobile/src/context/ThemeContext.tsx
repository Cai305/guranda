import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEMES, THEME_LIST, DEFAULT_THEME_ID, ThemeId, ThemeTokens } from '../theme/themes';

const STORAGE_KEY = '@mxit_theme_id';

interface ThemeContextType {
  themeId: ThemeId;
  theme: ThemeTokens;
  isReady: boolean;
  setThemeId: (id: ThemeId) => void;
  availableThemes: ThemeTokens[];
}

const ThemeContext = createContext<ThemeContextType>({
  themeId: DEFAULT_THEME_ID,
  theme: THEMES[DEFAULT_THEME_ID],
  isReady: false,
  setThemeId: () => {},
  availableThemes: THEME_LIST,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>(DEFAULT_THEME_ID);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored && stored in THEMES) {
          setThemeIdState(stored as ThemeId);
        }
      } catch (e) {
        console.error('Failed to load theme preference', e);
      } finally {
        setIsReady(true);
      }
    };
    loadTheme();
  }, []);

  const setThemeId = useCallback((id: ThemeId) => {
    setThemeIdState(id);
    AsyncStorage.setItem(STORAGE_KEY, id).catch(e => console.error('Failed to save theme preference', e));
  }, []);

  const theme = THEMES[themeId] ?? THEMES[DEFAULT_THEME_ID];

  return (
    <ThemeContext.Provider value={{ themeId, theme, isReady, setThemeId, availableThemes: THEME_LIST }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
