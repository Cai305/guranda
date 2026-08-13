import React from 'react';
import { NavigationContainer, DarkTheme, getStateFromPath as defaultGetStateFromPath } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { TabBarStyleProvider } from './src/context/TabBarStyleContext';
import { SocketProvider } from './src/context/SocketContext';
import { StoreProvider } from './src/context/StoreContext';
import { ActiveSessionProvider } from './src/context/ActiveSessionContext';
import { CartProvider } from './src/context/CartContext';
import { ShoppingCartProvider } from './src/context/ShoppingCartContext';
import { FeatureFlagsProvider } from './src/context/FeatureFlagsContext';
import * as Linking from 'expo-linking';
import { navigationRef } from './src/navigation/navigationRef';
import AiOrbProvider from './src/context/AiOrbContext';
import IncomingCallOverlay from './src/components/calls/IncomingCallOverlay';
import UploadStatusOverlay from './src/components/UploadStatusOverlay';
import ContextualNewsOverlay from './src/context/ContextualNewsOverlay';
import WebAlertHost from './src/utils/webAlertPolyfill';

const prefix = Linking.createURL('/');
const linking = {
  // lifeos:// is Guranda's original deep-link scheme (kept for compatibility); legacy mxit2:// links keep working too
  prefixes: [prefix, 'lifeos://', 'https://lifeos.app', 'mxit2://', 'https://mxit2.app'],
  config: {
    screens: {
      Main: {
        screens: {
          Chat: {
            screens: {
              AddContact: 'add/:username'
            }
          }
        }
      }
    }
  },
  // Almost every screen in this app is reached via navigation.navigate()
  // with runtime object params (a stream, a product, a user) that don't
  // exist yet on a fresh page load — React Navigation's default path
  // matching would try to restore one of those screens straight from the
  // URL and crash on the missing params. It also can't safely match
  // anything while auth is still hydrating (RootNavigator only registers
  // the Auth screens or the Main screens, never both, so a URL captured
  // before that resolves points at a screen that isn't registered yet).
  // Only the one deep link this app actually supports (add/:username) is
  // allowed to restore state from a URL — every other path, including a
  // hard reload on any in-app screen and any unrecognized/"wild" URL,
  // falls back to undefined so NavigationContainer boots into its normal
  // initial route (Login or Home, whichever auth resolves to) instead.
  getStateFromPath: (path: string, options: any) => {
    if (/^\/?add\//.test(path)) {
      return defaultGetStateFromPath(path, options);
    }
    return undefined;
  },
};

function AppContent() {
  const { theme } = useTheme();
  return (
    <AuthProvider>
      <FeatureFlagsProvider>
      <StoreProvider>
      <ActiveSessionProvider>
        <CartProvider>
        <ShoppingCartProvider>
        <SocketProvider>
          <StatusBar style="light" />
          <AiOrbProvider>
            <NavigationContainer ref={navigationRef} linking={linking} theme={{
              ...DarkTheme,
              colors: {
                ...DarkTheme.colors,
                primary: theme.COLORS.primary,
                background: theme.COLORS.background,
                card: theme.COLORS.surface,
                text: theme.COLORS.text,
                border: theme.COLORS.border,
                notification: theme.COLORS.secondary,
              }
            }}>
              <RootNavigator />
            </NavigationContainer>
          </AiOrbProvider>
          <IncomingCallOverlay />
          <UploadStatusOverlay />
          <ContextualNewsOverlay />
          <WebAlertHost />
        </SocketProvider>
        </ShoppingCartProvider>
        </CartProvider>
      </ActiveSessionProvider>
      </StoreProvider>
      </FeatureFlagsProvider>
    </AuthProvider>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <TabBarStyleProvider>
            <AppContent />
          </TabBarStyleProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
