import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../theme';

const STORAGE_KEY = '@mxit_language_setting';

const LANGUAGES = [
  { code: 'en', name: 'English', detail: 'English (United Kingdom / South Africa)' },
  { code: 'zu', name: 'isiZulu', detail: 'Zulu' },
  { code: 'xh', name: 'isiXhosa', detail: 'Xhosa' },
  { code: 'af', name: 'Afrikaans', detail: 'Afrikaans' },
  { code: 'st', name: 'Sesotho', detail: 'Southern Sotho' },
];

export default function LanguageScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [selectedLang, setSelectedLang] = useState('en');

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSelectedLang(stored);
      }
    } catch (e) {
      console.error('Failed to load language setting', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLanguage = async (code: string, name: string) => {
    try {
      setSelectedLang(code);
      await AsyncStorage.setItem(STORAGE_KEY, code);
      Alert.alert(
        'Language Changed',
        `Language updated to ${name}. The new language settings will apply on next app restart.`,
        [{ text: 'OK' }]
      );
    } catch (e) {
      console.error('Failed to save language setting', e);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h2}>Language</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Select App Language</Text>
        <View style={styles.card}>
          {LANGUAGES.map((lang, index) => {
            const isSelected = selectedLang === lang.code;
            return (
              <View key={lang.code}>
                {index > 0 && <View style={styles.divider} />}
                <TouchableOpacity
                  style={styles.langRow}
                  activeOpacity={0.7}
                  onPress={() => handleSelectLanguage(lang.code, lang.name)}
                >
                  <View style={styles.langInfo}>
                    <Text style={[styles.langName, isSelected && { color: COLORS.primary }]}>
                      {lang.name}
                    </Text>
                    <Text style={styles.langDetail}>{lang.detail}</Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  content: { padding: SPACING.lg },
  sectionTitle: {
    ...TYPOGRAPHY.label,
    fontSize: 12,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
  },
  langInfo: {
    flex: 1,
  },
  langName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  langDetail: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.glassBorder,
  },
});
