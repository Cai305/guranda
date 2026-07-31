import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { COLORS } from './src/theme';
import { SocketProvider } from './src/context/SocketContext';
import { StoreProvider } from './src/context/StoreContext';
import { ActiveSessionProvider } from './src/context/ActiveSessionContext';
import { CartProvider } from './src/context/CartContext';
import { ShoppingCartProvider } from './src/context/ShoppingCartContext';
import { FeatureFlagsProvider } from './src/context/FeatureFlagsContext';
import * as Linking from 'expo-linking';
import { navigationRef } from './src/navigation/navigationRef';
import AiFloatingOrb from './src/components/ai/AiFloatingOrb';
import IncomingCallOverlay from './src/components/calls/IncomingCallOverlay';

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
  }
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <FeatureFlagsProvider>
        <StoreProvider>
        <ActiveSessionProvider>
          <CartProvider>
          <ShoppingCartProvider>
          <SocketProvider>
            <StatusBar style="light" />
            <NavigationContainer ref={navigationRef} linking={linking} theme={{
              ...DarkTheme,
              colors: {
                ...DarkTheme.colors,
                primary: COLORS.primary,
                background: COLORS.background,
                card: COLORS.surface,
                text: COLORS.text,
                border: COLORS.border,
                notification: COLORS.secondary,
              }
            }}>
              <RootNavigator />
            </NavigationContainer>
            <AiFloatingOrb />
            <IncomingCallOverlay />
          </SocketProvider>
          </ShoppingCartProvider>
          </CartProvider>
        </ActiveSessionProvider>
        </StoreProvider>
        </FeatureFlagsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
