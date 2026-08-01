import React, { useEffect, useState } from 'react';
import { Alert, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../theme';

// react-native-web's Alert.alert is a total no-op (see
// react-native-web/dist/exports/Alert/index.js: `static alert() {}`) — every
// Alert.alert call across the app (confirmations, error messages, success
// notices — 170+ call sites) silently does nothing on web. Rather than touch
// every call site, we monkey-patch the shared `Alert` class's static method
// once at startup (it's the same module singleton every file imports), so
// every existing `Alert.alert(title, message, buttons)` call now renders a
// real modal on web while staying untouched on native, where the real
// Alert.alert already works.

interface QueuedAlert {
  id: number;
  title: string;
  message?: string;
  buttons: { text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }[];
}

type Listener = (queue: QueuedAlert[]) => void;
let queue: QueuedAlert[] = [];
let listener: Listener | null = null;
let nextId = 1;

function publish() {
  listener?.(queue);
}

function pushAlert(
  title: string,
  message?: string,
  buttons?: { text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }[],
) {
  const resolvedButtons = buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }];
  queue = [...queue, { id: nextId++, title, message, buttons: resolvedButtons }];
  publish();
}

function dismissTop() {
  queue = queue.slice(1);
  publish();
}

if (Platform.OS === 'web') {
  (Alert as any).alert = (
    title: string,
    message?: string,
    buttons?: { text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }[],
  ) => pushAlert(title, message, buttons);
}

export default function WebAlertHost() {
  const [current, setCurrent] = useState<QueuedAlert[]>(queue);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    listener = setCurrent;
    return () => { listener = null; };
  }, []);

  if (Platform.OS !== 'web' || current.length === 0) return null;
  const alertItem = current[0];

  const handlePress = (button: QueuedAlert['buttons'][number]) => {
    dismissTop();
    button.onPress?.();
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => dismissTop()}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{alertItem.title}</Text>
          {!!alertItem.message && <Text style={styles.message}>{alertItem.message}</Text>}
          <View style={styles.buttonRow}>
            {alertItem.buttons.map((button, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.button, i > 0 && styles.buttonDivider]}
                onPress={() => handlePress(button)}
              >
                <Text
                  style={[
                    styles.buttonText,
                    button.style === 'destructive' && styles.destructiveText,
                    button.style === 'cancel' && styles.cancelText,
                  ]}
                >
                  {button.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    padding: SPACING.lg,
  },
  title: { ...TYPOGRAPHY.h4, textAlign: 'center' },
  message: { ...TYPOGRAPHY.body2, textAlign: 'center', marginTop: 8, lineHeight: 19 },
  buttonRow: {
    flexDirection: 'row',
    marginTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.glassBorder,
  },
  button: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  buttonDivider: { borderLeftWidth: 1, borderLeftColor: COLORS.glassBorder },
  buttonText: { color: COLORS.primary, fontWeight: '700', fontSize: 14.5 },
  destructiveText: { color: COLORS.error },
  cancelText: { color: COLORS.textMuted, fontWeight: '600' },
});
