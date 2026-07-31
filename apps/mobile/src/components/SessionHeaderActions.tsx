// Consistent Minimize + Exit pair for game/Live/mini-app screen headers.
// Both ALWAYS navigate to a fixed destination (the Home tab) rather than
// relying on navigation.goBack() — the back-stack shape varies depending on
// how a screen was entered (root-level vs nested inside the Life tab's
// stack, or a cross-tab deep link), so a relative "back" can land somewhere
// unexpected or, if the stack ends up in a state a screen doesn't expect,
// silently fail to go anywhere. A fixed target sidesteps that entirely.
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../theme';
import { useActiveSession, ActiveSession } from '../context/ActiveSessionContext';

interface Props {
  navigation: any;
  session: ActiveSession;
}

export default function SessionHeaderActions({ navigation, session }: Props) {
  const { minimize } = useActiveSession();

  const goHome = () => {
    // Screens nested inside the Life tab's own stack (HubStackNavigator) stay
    // mounted there when we switch tabs — so if we don't also reset that
    // stack back to its root, re-opening the Life tab bounces the user right
    // back into the game/mini-app they just exited, with no way to reach the
    // hub or Store. Detect that case via routeNames (only the Hub stack has
    // 'LifeHome').
    //
    // The reset must happen, but not in the same tick as the tab switch —
    // dispatching it immediately steals focus back to the Life tab instead
    // of landing on Home. A fixed setTimeout delay used to defer it, but
    // that's a race: if the user re-opens the Life tab before the timeout
    // fires, they land back on the screen they just exited (the exact "Life
    // routes to the wrong screen" bug). Waiting for this screen's own
    // 'blur' event — which fires exactly when the tab switch completes —
    // ties the reset to the real transition instead of a guessed delay.
    const state = navigation.getState?.();
    const needsReset = state?.routeNames?.includes('LifeHome') && state.index > 0;
    if (needsReset) {
      const unsubscribe = navigation.addListener('blur', () => {
        unsubscribe();
        navigation.reset({ index: 0, routes: [{ name: 'LifeHome' }] });
      });
    }
    navigation.navigate('Main', { screen: 'Home' });
  };

  const onMinimize = () => {
    minimize(session);
    goHome();
  };

  return (
    <View style={styles.row}>
      <TouchableOpacity style={styles.btn} onPress={onMinimize} accessibilityLabel="Minimize">
        <Ionicons name="chevron-down" size={20} color={COLORS.text} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.btn} onPress={goHome} accessibilityLabel="Exit">
        <Ionicons name="close" size={20} color={COLORS.text} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  btn: {
    width: 36, height: 36, borderRadius: RADIUS.pill,
    backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
    justifyContent: 'center', alignItems: 'center',
  },
});
