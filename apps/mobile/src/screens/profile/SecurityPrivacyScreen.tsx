import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Switch, ScrollView, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';

const STORAGE_KEY = '@mxit_security_settings';

export default function SecurityPrivacyScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY, SPACING } = theme;
  const [loading, setLoading] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);
  const [readReceipts, setReadReceipts] = useState(true);
  const [visibility, setVisibility] = useState<'public' | 'friends' | 'private'>('public');
  
  // Password modal state
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Blocked users state
  const [blockedUsers, setBlockedUsers] = useState([
    { id: '1', username: 'spam_bot_99', displayName: 'Spam Bot' },
    { id: '2', username: 'troll_master', displayName: 'Troll Master' },
  ]);

  const styles = useThemedStyles(({ COLORS, SPACING, TYPOGRAPHY, RADIUS }) => ({
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
      marginBottom: SPACING.lg,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: SPACING.md,
    },
    clickableRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: SPACING.md,
    },
    columnRow: {
      padding: SPACING.md,
    },
    infoCol: { flex: 1, marginRight: SPACING.md },
    rowLabel: {
      color: COLORS.text,
      fontSize: 15,
      fontWeight: '600',
    },
    rowDesc: {
      ...TYPOGRAPHY.caption,
      color: COLORS.textMuted,
      marginTop: 2,
    },
    divider: { height: 1, backgroundColor: COLORS.glassBorder },
    visOptions: {
      flexDirection: 'row',
      gap: SPACING.sm,
    },
    visBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: RADIUS.sm,
      borderWidth: 1,
      borderColor: COLORS.border,
      alignItems: 'center',
      backgroundColor: COLORS.surface,
    },
    visBtnActive: {
      borderColor: COLORS.primary,
      backgroundColor: 'rgba(139, 92, 246, 0.15)',
    },
    visBtnText: {
      color: COLORS.textMuted,
      fontWeight: '600',
      fontSize: 13,
    },
    visBtnTextActive: {
      color: COLORS.primary,
    },
    blockedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: SPACING.md,
    },
    blockedName: {
      color: COLORS.text,
      fontSize: 15,
      fontWeight: '600',
    },
    blockedUsername: {
      ...TYPOGRAPHY.caption,
      color: COLORS.textMuted,
    },
    unblockBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: RADIUS.sm,
      borderWidth: 1,
      borderColor: 'rgba(248, 113, 113, 0.3)',
      backgroundColor: 'rgba(248, 113, 113, 0.08)',
    },
    unblockBtnText: {
      color: COLORS.error,
      fontWeight: '600',
      fontSize: 12,
    },
    emptyContainer: {
      padding: SPACING.lg,
      alignItems: 'center',
    },
    emptyText: {
      color: COLORS.textMuted,
      fontSize: 14,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'center',
      padding: SPACING.lg,
    },
    modalContent: {
      backgroundColor: COLORS.surfaceElevated,
      borderRadius: RADIUS.lg,
      padding: SPACING.lg,
      borderWidth: 1,
      borderColor: COLORS.glassBorder,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.lg,
    },
    modalLabel: {
      ...TYPOGRAPHY.label,
      fontSize: 11,
      marginBottom: SPACING.xs,
      marginTop: SPACING.md,
    },
    modalInput: {
      backgroundColor: COLORS.surface,
      color: COLORS.text,
      padding: 12,
      borderRadius: RADIUS.sm,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    submitBtn: {
      backgroundColor: COLORS.primary,
      padding: 15,
      borderRadius: RADIUS.md,
      alignItems: 'center',
      marginTop: SPACING.xl,
    },
    submitBtnText: {
      color: '#FFF',
      fontWeight: 'bold',
      fontSize: 16,
    },
  }));

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setTwoFactor(parsed.twoFactor ?? false);
        setReadReceipts(parsed.readReceipts ?? true);
        setVisibility(parsed.visibility ?? 'public');
      }
    } catch (e) {
      console.error('Failed to load security settings', e);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (updates: { twoFactor?: boolean; readReceipts?: boolean; visibility?: 'public' | 'friends' | 'private' }) => {
    try {
      const current = { twoFactor, readReceipts, visibility, ...updates };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch (e) {
      console.error('Failed to save security settings', e);
    }
  };

  const handleToggle2FA = (val: boolean) => {
    setTwoFactor(val);
    saveSettings({ twoFactor: val });
  };

  const handleToggleReadReceipts = (val: boolean) => {
    setReadReceipts(val);
    saveSettings({ readReceipts: val });
  };

  const handleSelectVisibility = (val: 'public' | 'friends' | 'private') => {
    setVisibility(val);
    saveSettings({ visibility: val });
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'All fields are required');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return;
    }

    setUpdatingPassword(true);
    try {
      const res = await fetchApi('/users/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        Alert.alert('Error', err.message || 'Failed to update password');
        return;
      }

      setPasswordModalVisible(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Success', 'Password updated successfully!');
    } catch (e) {
      Alert.alert('Error', 'Failed to update password');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleUnblockUser = (id: string, username: string) => {
    Alert.alert('Unblock User', `Are you sure you want to unblock @${username}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unblock',
        onPress: () => {
          setBlockedUsers(prev => prev.filter(u => u.id !== id));
          Alert.alert('Unblocked', `@${username} has been unblocked.`);
        },
      },
    ]);
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
        <Text style={TYPOGRAPHY.h2}>Security & Privacy</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Security Section */}
        <Text style={styles.sectionTitle}>Security Settings</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.infoCol}>
              <Text style={styles.rowLabel}>Two-Factor Authentication</Text>
              <Text style={styles.rowDesc}>Add an extra layer of security to your wallet and account</Text>
            </View>
            <Switch
              value={twoFactor}
              onValueChange={handleToggle2FA}
              trackColor={{ false: COLORS.border, true: COLORS.primaryDeep }}
              thumbColor={twoFactor ? COLORS.primary : COLORS.textMuted}
            />
          </View>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.clickableRow} onPress={() => setPasswordModalVisible(true)}>
            <View style={styles.infoCol}>
              <Text style={styles.rowLabel}>Change Password</Text>
              <Text style={styles.rowDesc}>Update your account password</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Privacy Section */}
        <Text style={styles.sectionTitle}>Privacy Settings</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.infoCol}>
              <Text style={styles.rowLabel}>Read Receipts</Text>
              <Text style={styles.rowDesc}>Let others see when you have read their direct messages</Text>
            </View>
            <Switch
              value={readReceipts}
              onValueChange={handleToggleReadReceipts}
              trackColor={{ false: COLORS.border, true: COLORS.primaryDeep }}
              thumbColor={readReceipts ? COLORS.primary : COLORS.textMuted}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.columnRow}>
            <Text style={styles.rowLabel}>Profile Visibility</Text>
            <Text style={[styles.rowDesc, { marginBottom: SPACING.md }]}>Control who can view your profile and story history</Text>
            <View style={styles.visOptions}>
              {(['public', 'friends', 'private'] as const).map(option => (
                <TouchableOpacity
                  key={option}
                  style={[styles.visBtn, visibility === option && styles.visBtnActive]}
                  onPress={() => handleSelectVisibility(option)}
                >
                  <Text style={[styles.visBtnText, visibility === option && styles.visBtnTextActive]}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Blocked Users Section */}
        <Text style={styles.sectionTitle}>Blocked Users</Text>
        <View style={styles.card}>
          {blockedUsers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No blocked users</Text>
            </View>
          ) : (
            blockedUsers.map((user, index) => (
              <View key={user.id}>
                {index > 0 && <View style={styles.divider} />}
                <View style={styles.blockedRow}>
                  <View>
                    <Text style={styles.blockedName}>{user.displayName}</Text>
                    <Text style={styles.blockedUsername}>@{user.username}</Text>
                  </View>
                  <TouchableOpacity style={styles.unblockBtn} onPress={() => handleUnblockUser(user.id, user.username)}>
                    <Text style={styles.unblockBtnText}>Unblock</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal visible={passwordModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={TYPOGRAPHY.h2}>Change Password</Text>
              <TouchableOpacity onPress={() => setPasswordModalVisible(false)}>
                <Ionicons name="close" size={28} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Current Password</Text>
            <TextInput
              style={styles.modalInput}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={COLORS.textMuted}
            />

            <Text style={styles.modalLabel}>New Password</Text>
            <TextInput
              style={styles.modalInput}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={COLORS.textMuted}
            />

            <Text style={styles.modalLabel}>Confirm New Password</Text>
            <TextInput
              style={styles.modalInput}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={COLORS.textMuted}
            />

            <TouchableOpacity style={styles.submitBtn} onPress={handleUpdatePassword} disabled={updatingPassword}>
              {updatingPassword ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitBtnText}>Update Password</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
