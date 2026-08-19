import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { fetchApi } from '../utils/api';

export default function CreateCommunityScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY } = theme;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY }) => ({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    keyboardContainer: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 15,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    closeBtn: {
      padding: 5,
    },
    createBtn: {
      backgroundColor: COLORS.primary,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
    },
    createBtnDisabled: {
      opacity: 0.5,
    },
    createBtnText: {
      ...TYPOGRAPHY.body2,
      color: COLORS.surface,
      fontWeight: 'bold',
    },
    form: {
      padding: 20,
    },
    label: {
      ...TYPOGRAPHY.body2,
      color: COLORS.textMuted,
      marginBottom: 8,
      marginTop: 16,
    },
    input: {
      backgroundColor: COLORS.surface,
      color: COLORS.text,
      paddingHorizontal: 15,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: COLORS.border,
      fontSize: 16,
    },
    textArea: {
      minHeight: 100,
    },
  }));

  const handleCreate = async () => {
    if (!name.trim()) return;
    
    try {
      setLoading(true);
      const res = await fetchApi('/communities', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), description: description.trim() })
      });
      
      if (res.ok) {
        const community = await res.json();
        navigation.replace('Community', { communityId: community.id, communityName: community.name });
      } else {
        const data = await res.json().catch(() => null);
        Alert.alert('Error', data?.message || "Couldn't create the community. Please try again.");
      }
    } catch (e) {
      Alert.alert('Error', 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <Ionicons name="close" size={28} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={TYPOGRAPHY.h3}>New Community</Text>
          <TouchableOpacity 
            style={[styles.createBtn, (!name.trim() || loading) && styles.createBtnDisabled]}
            onPress={handleCreate}
            disabled={!name.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.surface} size="small" />
            ) : (
              <Text style={styles.createBtnText}>Create</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Community Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. MXit Crypto Fans"
            placeholderTextColor={COLORS.textMuted}
            value={name}
            onChangeText={setName}
            autoFocus
          />

          <Text style={styles.label}>Description (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="What is this community about?"
            placeholderTextColor={COLORS.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
