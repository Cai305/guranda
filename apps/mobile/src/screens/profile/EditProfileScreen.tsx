import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ScrollView, ActivityIndicator, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useAuth } from '../../context/AuthContext';
import { fetchApi, uploadImage } from '../../utils/api';

const RELATIONSHIP_OPTIONS: { value: string; label: string }[] = [
  { value: 'SINGLE', label: 'Single' },
  { value: 'IN_RELATIONSHIP', label: 'In a Relationship' },
  { value: 'MARRIED', label: 'Married' },
  { value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' },
];

export default function EditProfileScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY } = theme;
  const { user, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [statusMessage, setStatusMessage] = useState(user?.statusMessage || '');
  const [autoStatusEnabled, setAutoStatusEnabled] = useState(user?.autoStatusEnabled ?? true);
  const [avatarUri, setAvatarUri] = useState(user?.avatarUrl || '');
  const [relationshipStatus, setRelationshipStatus] = useState(user?.relationshipStatus || null);
  const [loading, setLoading] = useState(false);

  const pickRelationshipStatus = async (value: string) => {
    if (value === 'IN_RELATIONSHIP' || value === 'MARRIED') {
      // Linking to a partner is a separate flow (search + send request) —
      // the profile field itself only updates once they accept (see
      // RelationshipsService.acceptRequest), not immediately here.
      navigation.navigate('SendRelationshipRequest', { intendedStatus: value });
      return;
    }
    setRelationshipStatus(value);
    try {
      await fetchApi('/relationships/status', { method: 'PATCH', body: JSON.stringify({ status: value }) });
    } catch (e) {
      console.error(e);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0].uri) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  useEffect(() => {
    if (route?.params?.editedImageUri) {
      setAvatarUri(route.params.editedImageUri);
      navigation.setParams({ editedImageUri: undefined });
    }
  }, [route?.params?.editedImageUri]);

  const editAvatar = () => {
    if (!avatarUri) return;
    navigation.navigate('MediaEditor', {
      initialImageUri: avatarUri,
      mode: 'photo',
      aspectRatio: 1,
      returnScreen: 'EditProfile',
      returnParamKey: 'editedImageUri',
    });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      let avatarUrl = user?.avatarUrl;
      
      // If the avatarUri is local (starts with file:// or content://), we need to upload it
      if (avatarUri && !avatarUri.startsWith('http')) {
        avatarUrl = await uploadImage(avatarUri);
      }

      const res = await fetchApi('/users/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          bio,
          statusMessage,
          avatarUrl,
          autoStatusEnabled,
        }),
      });

      if (!res.ok) throw new Error('Failed to update profile');

      await refreshProfile();
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const styles = useThemedStyles(({ COLORS, SPACING, RADIUS, TYPOGRAPHY }) => ({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    content: {
      padding: SPACING.lg,
    },
    avatarContainer: {
      alignSelf: 'center',
      marginBottom: SPACING.xl,
      position: 'relative',
    },
    avatar: {
      width: 120,
      height: 120,
      borderRadius: 60,
      borderWidth: 2,
      borderColor: COLORS.primary,
      backgroundColor: COLORS.surface,
    },
    editAvatarBtn: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      backgroundColor: COLORS.primary,
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: COLORS.background,
    },
    editAvatarWandBtn: {
      position: 'absolute',
      left: 0,
      bottom: 0,
      backgroundColor: COLORS.secondary,
      width: 30,
      height: 30,
      borderRadius: 15,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: COLORS.background,
    },
    formGroup: {
      marginBottom: SPACING.lg,
    },
    label: {
      ...TYPOGRAPHY.label,
      marginBottom: SPACING.xs,
    },
    input: {
      backgroundColor: COLORS.surface,
      color: COLORS.text,
      padding: SPACING.md,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    textArea: {
      minHeight: 100,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: RADIUS.pill,
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    chipActive: {
      backgroundColor: COLORS.primary,
      borderColor: COLORS.primary,
    },
    chipText: {
      color: COLORS.textMuted,
      fontSize: 12,
      fontWeight: '700',
    },
    chipTextActive: {
      color: '#fff',
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: COLORS.border,
      padding: SPACING.md,
      marginBottom: SPACING.lg,
    },
    toggleHint: {
      color: COLORS.textMuted,
      fontSize: 12,
      marginTop: 4,
      lineHeight: 16,
    },
    saveBtn: {
      backgroundColor: COLORS.primary,
      padding: SPACING.md,
      borderRadius: RADIUS.md,
      alignItems: 'center',
      marginTop: SPACING.lg,
    },
    saveBtnText: {
      ...TYPOGRAPHY.button,
      color: '#FFF',
    },
  }));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h2}>Edit Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: avatarUri || `https://api.dicebear.com/7.x/avataaars/png?seed=${user?.username || 'user'}` }}
            style={styles.avatar}
          />
          <TouchableOpacity style={styles.editAvatarBtn} onPress={pickImage}>
            <Ionicons name="camera" size={20} color="#FFF" />
          </TouchableOpacity>
          {avatarUri ? (
            <TouchableOpacity style={styles.editAvatarWandBtn} onPress={editAvatar}>
              <Ionicons name="color-wand-outline" size={16} color="#FFF" />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Display Name</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your name"
            placeholderTextColor={COLORS.textMuted}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={bio}
            onChangeText={setBio}
            placeholder="Tell us about yourself"
            placeholderTextColor={COLORS.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Status Message</Text>
          <TextInput
            style={styles.input}
            value={statusMessage}
            onChangeText={setStatusMessage}
            placeholder="What's on your mind?"
            placeholderTextColor={COLORS.textMuted}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Relationship Status</Text>
          <View style={styles.chipRow}>
            {RELATIONSHIP_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.chip, relationshipStatus === opt.value && styles.chipActive]}
                onPress={() => pickRelationshipStatus(opt.value)}
              >
                <Text style={[styles.chipText, relationshipStatus === opt.value && styles.chipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Auto-update my status</Text>
            <Text style={styles.toggleHint}>
              Shows what you're currently doing (e.g. "At the car wash", "On a flight") based on your bookings, instead of the message above.
            </Text>
          </View>
          <Switch
            value={autoStatusEnabled}
            onValueChange={setAutoStatusEnabled}
            trackColor={{ false: COLORS.border, true: COLORS.primary }}
          />
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveBtnText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
