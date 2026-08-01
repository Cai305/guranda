import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, TextInput, Image, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING, GRADIENTS, BRAND } from '../theme';
import { fetchApi } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const BADGES = [
  { id: 'pioneer', emoji: '🏆', name: 'Pioneer' },
  { id: 'og', emoji: '💎', name: 'OG Member' },
  { id: 'gamer', emoji: '🎮', name: 'Gamer' },
  { id: 'social', emoji: '🦋', name: 'Butterfly' },
];

const GAME_HISTORY = [
  { id: 'chess', name: 'Chess', detail: '12 matches · 7 wins', icon: 'extension-puzzle' },
  { id: 'trivia', name: 'Trivia Arcade', detail: 'High score: 500', icon: 'help-circle' },
  { id: 'cards', name: '5 Cards & Cassino', detail: 'View match history & stats', icon: 'albums' },
];

const DIGITAL_LIFE_SECTIONS = [
  { routeName: 'Dashboard', label: 'Jobs & Businesses', icon: 'briefcase-outline', color: '#0EA5E9', bg: 'rgba(14, 165, 233, 0.15)' },
  { routeName: 'MyListings', label: 'Marketplace Listings', icon: 'storefront-outline', color: '#FB923C', bg: 'rgba(251, 146, 60, 0.15)' },
  { routeName: 'MyProperties', label: 'Property Portfolio', icon: 'home-outline', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' },
];

const VERIFY_BADGE: Record<string, { label: string; color: string; icon: string }> = {
  VERIFIED: { label: 'Verified', color: '#10B981', icon: 'shield-checkmark' },
  PENDING: { label: 'Under review', color: '#F59E0B', icon: 'time' },
  REJECTED: { label: 'Not approved', color: '#F87171', icon: 'close-circle' },
  UNVERIFIED: { label: 'Not verified', color: COLORS.textMuted, icon: 'shield-outline' },
};

export default function ProfileScreen({ navigation }: any) {
  const { user, logout, verificationStatus } = useAuth();
  const vBadge = VERIFY_BADGE[verificationStatus || 'UNVERIFIED'];
  const [devModalVisible, setDevModalVisible] = useState(false);
  const [appName, setAppName] = useState('');
  const [appUrl, setAppUrl] = useState('');
  const [appType, setAppType] = useState('Plugin'); // or Game
  const [creatorFunds, setCreatorFunds] = useState<{ pendingBalance: number; nextPayoutDate: string } | null>(null);

  useEffect(() => {
    fetchApi('/wallets/creator-funds/summary')
      .then(r => (r.ok ? r.json() : null))
      .then(d => d && setCreatorFunds(d))
      .catch(() => {});
  }, []);

  const displayName = user?.displayName || user?.username || 'Guranda Pioneer';
  const username = user?.username ? `@${user.username}` : '@pioneer';
  const xrplAddress = user?.xrplAddress || 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh';

  const submitApp = async () => {
    if (!appName || !appUrl) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    try {
      const res = await fetchApi('/store/apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: appName,
          type: appType,
          sourceUrl: appUrl,
          iconUrl: appType === 'Game' ? 'game-controller' : 'apps',
          color: '#3A86FF'
        })
      });
      if (res.ok) {
        Alert.alert('Success', 'Your mini-app has been published to the Guranda Store!');
        setDevModalVisible(false);
        setAppName('');
        setAppUrl('');
      } else {
        Alert.alert('Error', 'Failed to publish app');
      }
    } catch {
      Alert.alert('Error', 'Network error');
    }
  };

  const shareReferralCode = async () => {
    try {
      const res = await fetchApi('/referrals/my-code');
      if (!res.ok) throw new Error('Failed to load referral code');
      const { code } = await res.json();
      await Share.share({ message: `Join me on Guranda! Use my referral code ${code} when you sign up.` });
    } catch {
      Alert.alert('Error', 'Could not load your referral code');
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out of your Guranda?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const menuItems = [
    { icon: 'grid-outline', label: 'Dashboard', onPress: () => navigation.navigate('Dashboard') },
    { icon: 'code-working-outline', label: 'Developer Hub (Publish App)', onPress: () => setDevModalVisible(true) },
    { icon: 'person-outline', label: 'Edit Profile', onPress: () => navigation.navigate('EditProfile') },
    { icon: 'shield-checkmark-outline', label: 'Security & Privacy', onPress: () => navigation.navigate('SecurityPrivacy') },
    { icon: 'sparkles-outline', label: 'AI Access & Permissions', onPress: () => navigation.navigate('AiAccess') },
    { icon: 'notifications-outline', label: 'Notifications', onPress: () => navigation.navigate('NotificationsSettings') },
    { icon: 'color-palette-outline', label: 'Appearance', onPress: () => navigation.navigate('Appearance') },
    { icon: 'language-outline', label: 'Language', onPress: () => navigation.navigate('Language') },
    { icon: 'help-circle-outline', label: 'Help & Support', onPress: () => navigation.navigate('HelpSupport') },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* ===== Identity header ===== */}
        <LinearGradient
          colors={GRADIENTS.midnight}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.identityCard}
        >
          <View style={styles.identityTop}>
            <Image
              source={{ uri: user?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/png?seed=${user?.username || 'lifeos'}` }}
              style={styles.avatar}
            />
            <View style={styles.levelPill}>
              <Ionicons name="flash" size={12} color={COLORS.gold} />
              <Text style={styles.levelText}>{user?.level || 'Nano'}</Text>
            </View>
          </View>
          <Text style={styles.displayName}>{displayName}</Text>
          <Text style={styles.username}>{username}</Text>
          {!!(user?.effectiveStatus || user?.bio) && (
            <Text style={styles.statusLine} numberOfLines={2}>{user?.effectiveStatus || user?.bio}</Text>
          )}

          <View style={styles.repRow}>
            <View style={styles.repItem}>
              <Text style={styles.repValue}>{user?.reputation ?? 0}</Text>
              <Text style={styles.repLabel}>Reputation</Text>
            </View>
            <View style={styles.repDivider} />
            <View style={styles.repItem}>
              <Text style={styles.repValue}>{user?.subscribers ?? 0}</Text>
              <Text style={styles.repLabel}>Subscribers</Text>
            </View>
            <View style={styles.repDivider} />
            <View style={styles.repItem}>
              <Text style={styles.repValue}>3</Text>
              <Text style={styles.repLabel}>Communities</Text>
            </View>
            <View style={styles.repDivider} />
            <View style={styles.repItem}>
              <Text style={styles.repValue}>{BADGES.length}</Text>
              <Text style={styles.repLabel}>Badges</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ===== Badges ===== */}
        <Text style={styles.sectionLabel}>BADGES</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgeRow}>
          {BADGES.map(b => (
            <View key={b.id} style={styles.badgeCard}>
              <Text style={styles.badgeEmoji}>{b.emoji}</Text>
              <Text style={styles.badgeName}>{b.name}</Text>
            </View>
          ))}
        </ScrollView>

        {/* ===== Verification ===== */}
        <Text style={styles.sectionLabel}>ACCOUNT VERIFICATION</Text>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('VerifyAccount')}
        >
          <View style={styles.cardRow}>
            <View style={[styles.rowIcon, { backgroundColor: vBadge.color + '22' }]}>
              <Ionicons name={vBadge.icon as any} size={20} color={vBadge.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{vBadge.label}</Text>
              <Text style={styles.rowDetail}>
                {verificationStatus === 'VERIFIED'
                  ? 'Wallet and creator funds unlocked'
                  : 'Required to use the wallet or earn creator funds'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </View>
        </TouchableOpacity>

        {/* ===== Wallet ===== */}
        <Text style={styles.sectionLabel}>WALLET</Text>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Home', { screen: 'WalletHome' })}
        >
          <View style={styles.cardRow}>
            <View style={[styles.rowIcon, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
              <Ionicons name="wallet" size={20} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Guranda Wallet</Text>
              <Text style={styles.addressText} numberOfLines={1} ellipsizeMode="middle">
                {xrplAddress}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </View>
        </TouchableOpacity>

        {/* ===== Referrals ===== */}
        <Text style={styles.sectionLabel}>REFERRALS</Text>
        <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={shareReferralCode}>
          <View style={styles.cardRow}>
            <View style={[styles.rowIcon, { backgroundColor: 'rgba(52, 211, 153, 0.15)' }]}>
              <Ionicons name="gift" size={20} color={COLORS.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Invite Friends, Earn MSH</Text>
              <Text style={styles.rowDetail}>Share your referral code — get rewarded when they play</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </View>
        </TouchableOpacity>

        {/* ===== Gaming history ===== */}
        <Text style={styles.sectionLabel}>GAMING</Text>
        <View style={styles.card}>
          {GAME_HISTORY.map((g, i) => (
            <TouchableOpacity
              key={g.id}
              style={[styles.cardRow, i < GAME_HISTORY.length - 1 && styles.rowBorder]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Life', { screen: 'Games' })}
            >
              <View style={[styles.rowIcon, { backgroundColor: 'rgba(34, 211, 238, 0.12)' }]}>
                <Ionicons name={g.icon as any} size={20} color={COLORS.secondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{g.name}</Text>
                <Text style={styles.rowDetail}>{g.detail}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* ===== Content Earnings (CCR) ===== */}
        {(() => {
          const nextPayoutDate = creatorFunds
            ? new Date(creatorFunds.nextPayoutDate).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
            : '—';
          return (
            <>
              <Text style={styles.sectionLabel}>CONTENT EARNINGS</Text>
              <View style={styles.card}>
                <View style={styles.cardRow}>
                  <View style={[styles.rowIcon, { backgroundColor: 'rgba(251, 191, 36, 0.12)' }]}>
                    <Ionicons name="ribbon-outline" size={20} color={COLORS.gold} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>Content Contribution Remuneration</Text>
                    <Text style={styles.rowDetail}>Earned when others like, comment, or rank your "of the Day" stories (0.58 MSH each) — paid out in one lump sum on your next payout date</Text>
                  </View>
                </View>
                <View style={[styles.cardRow, styles.rowBorder]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowDetail, { marginBottom: 2 }]}>Pending balance</Text>
                    <Text style={[styles.rowTitle, { color: COLORS.gold, fontSize: 20, fontWeight: '800' }]}>
                      {creatorFunds ? creatorFunds.pendingBalance.toFixed(2) : '—'} MSH
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.rowDetail, { marginBottom: 2 }]}>Next payout</Text>
                    <Text style={[styles.rowDetail, { color: COLORS.text, fontWeight: '600' }]}>{nextPayoutDate}</Text>
                  </View>
                </View>
              </View>
            </>
          );
        })()}

        {/* ===== Digital Life sections ===== */}
        <Text style={styles.sectionLabel}>YOUR DIGITAL LIFE</Text>
        <View style={styles.card}>
          {DIGITAL_LIFE_SECTIONS.map((s, i) => (
            <TouchableOpacity
              key={s.routeName}
              style={[styles.cardRow, i < DIGITAL_LIFE_SECTIONS.length - 1 && styles.rowBorder]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate(s.routeName)}
            >
              <View style={[styles.rowIcon, { backgroundColor: s.bg }]}>
                <Ionicons name={s.icon as any} size={20} color={s.color} />
              </View>
              <Text style={[styles.rowTitle, { flex: 1 }]}>{s.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* ===== Settings menu ===== */}
        <Text style={styles.sectionLabel}>SETTINGS</Text>
        <View style={styles.card}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.cardRow, index < menuItems.length - 1 && styles.rowBorder]}
              onPress={item.onPress}
              activeOpacity={0.6}
            >
              <Ionicons name={item.icon as any} size={22} color={COLORS.text} />
              <Text style={[styles.rowTitle, { flex: 1, marginLeft: SPACING.md }]}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* ===== Logout ===== */}
        <TouchableOpacity style={styles.logoutButton} activeOpacity={0.6} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color={COLORS.error} />
          <Text style={[TYPOGRAPHY.body1, { color: COLORS.error, marginLeft: 10 }]}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>{BRAND.name} · {BRAND.tagline}</Text>
      </ScrollView>

      {/* Developer Modal */}
      <Modal visible={devModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={TYPOGRAPHY.h2}>Publish Mini-App</Text>
              <TouchableOpacity onPress={() => setDevModalVisible(false)}>
                <Ionicons name="close" size={28} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <Text style={[TYPOGRAPHY.body2, { marginBottom: 5 }]}>App Name</Text>
            <TextInput style={styles.input} value={appName} onChangeText={setAppName} placeholder="My Awesome Game" placeholderTextColor={COLORS.textMuted} />

            <Text style={[TYPOGRAPHY.body2, { marginBottom: 5, marginTop: 15 }]}>App URL</Text>
            <TextInput style={styles.input} value={appUrl} onChangeText={setAppUrl} placeholder="https://myapp.com" placeholderTextColor={COLORS.textMuted} autoCapitalize="none" />

            <Text style={[TYPOGRAPHY.body2, { marginBottom: 5, marginTop: 15 }]}>App Type</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
              <TouchableOpacity style={[styles.typeBtn, appType === 'Game' && styles.typeBtnActive]} onPress={() => setAppType('Game')}>
                <Text style={[styles.typeBtnText, appType === 'Game' && styles.typeBtnTextActive]}>Game</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.typeBtn, appType === 'Plugin' && styles.typeBtnActive]} onPress={() => setAppType('Plugin')}>
                <Text style={[styles.typeBtnText, appType === 'Plugin' && styles.typeBtnTextActive]}>Plugin</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={submitApp}>
              <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>Publish App</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  identityCard: {
    margin: SPACING.lg,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  identityTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surface,
  },
  levelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.4)',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  levelText: {
    color: COLORS.gold,
    fontSize: 12,
    fontWeight: '700',
  },
  displayName: {
    ...TYPOGRAPHY.h2,
    marginTop: SPACING.md,
  },
  username: {
    ...TYPOGRAPHY.body2,
    marginTop: 2,
  },
  statusLine: {
    ...TYPOGRAPHY.body2,
    color: COLORS.textMuted,
    marginTop: 6,
    textAlign: 'center',
  },
  repRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.lg,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
  },
  repItem: {
    flex: 1,
    alignItems: 'center',
  },
  repDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  repValue: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
  },
  repLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 10,
    marginTop: 2,
  },
  sectionLabel: {
    ...TYPOGRAPHY.label,
    fontSize: 11,
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  badgeRow: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  badgeCard: {
    alignItems: 'center',
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  badgeEmoji: {
    fontSize: 26,
  },
  badgeName: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    marginTop: 4,
  },
  card: {
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: SPACING.md,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glassBorder,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
  rowDetail: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
    marginTop: 2,
  },
  addressText: {
    color: COLORS.secondary,
    fontFamily: 'monospace',
    fontSize: 11,
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xl,
    marginHorizontal: SPACING.lg,
    paddingVertical: 14,
    backgroundColor: COLORS.glass,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.4)',
  },
  footerText: {
    ...TYPOGRAPHY.caption,
    textAlign: 'center',
    marginTop: SPACING.lg,
    fontSize: 10,
    letterSpacing: 1,
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
  input: {
    backgroundColor: COLORS.surface,
    color: COLORS.text,
    padding: 12,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typeBtn: {
    flex: 1,
    padding: 12,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  typeBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  typeBtnText: {
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  typeBtnTextActive: {
    color: COLORS.primary,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
});
