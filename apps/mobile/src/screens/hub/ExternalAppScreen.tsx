import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY } from '../../theme';

export default function ExternalAppScreen({ route, navigation }: any) {
  const { sourceUrl, name } = route.params;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h3}>{name || 'Mini-App'}</Text>
        <View style={{ width: 28 }} />
      </View>
      <View style={{ flex: 1 }}>
        {!sourceUrl ? (
          <View style={styles.loaderContainer}>
            <Text style={[TYPOGRAPHY.body1, { color: COLORS.textMuted }]}>Invalid URL</Text>
          </View>
        ) : Platform.OS === 'web' ? (
          // react-native-webview is native-only (iOS/Android) — the web
          // build already has a real DOM to work with, so a plain iframe
          // does the same job here instead of showing its "not supported"
          // fallback text.
          // @ts-ignore -- 'iframe' isn't a react-native-web View but RNW
          // passes unknown host component names straight through to the DOM.
          <iframe src={sourceUrl} title={name || 'Mini-App'} style={webFrameStyle} />
        ) : (
          <WebView
            source={{ uri: sourceUrl }}
            style={{ flex: 1 }}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const webFrameStyle = { flex: 1, width: '100%', height: '100%', border: 'none' } as any;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  loaderContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  }
});
