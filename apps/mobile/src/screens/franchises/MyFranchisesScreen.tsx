import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';

// "Manage my franchises" dashboard — the root brand alias plus every
// franchise-location alias beneath it (Phase 7). Three real states:
// (1) not a verified business yet, (2) verified but no root brand alias
// designated yet, (3) full hierarchy view with a create-location entry point.
export default function MyFranchisesScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, SPACING, TYPOGRAPHY } = theme;
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<{ id: string; name: string } | null>(null);
  const [hierarchy, setHierarchy] = useState<{ parent: any; children: any[] } | null>(null);
  const [myAliases, setMyAliases] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const bizRes = await fetchApi('/franchises/my-business');
      const bizData = bizRes.ok ? await bizRes.json() : { business: null };
      setBusiness(bizData.business);

      if (bizData.business) {
        const [hierRes, aliasRes] = await Promise.all([
          fetchApi(`/franchises/business/${bizData.business.id}/hierarchy`),
          fetchApi('/usernames/mine'),
        ]);
        setHierarchy(hierRes.ok ? await hierRes.json() : { parent: null, children: [] });
        const aliases = aliasRes.ok ? await aliasRes.json() : [];
        setMyAliases(Array.isArray(aliases) ? aliases.filter((a: any) => !a.businessId && !a.parentUsernameId) : []);
      } else {
        setHierarchy(null);
      }
    } catch {
      // leave whatever state we have
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING, TYPOGRAPHY }) => ({
    root: { flex: 1, backgroundColor: COLORS.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    },
    backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
    fab: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14, paddingHorizontal: 40 },
    emptyText: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
    primaryBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.pill, paddingHorizontal: 24, paddingVertical: 12 },
    primaryBtnText: { color: '#fff', fontWeight: '700' },
    sectionLabel: { ...TYPOGRAPHY.label, marginHorizontal: SPACING.lg, marginTop: SPACING.lg, marginBottom: 8 },
    rootCard: {
      marginHorizontal: SPACING.lg, borderRadius: RADIUS.lg, overflow: 'hidden',
    },
    rootGradient: { padding: SPACING.lg },
    rootLabel: { color: '#fff', fontSize: 20, fontWeight: '900' },
    rootMeta: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 4 },
    aliasPickCard: {
      marginHorizontal: SPACING.lg, marginBottom: 10, padding: 14, backgroundColor: COLORS.surface,
      borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    aliasPickLabel: { color: COLORS.text, fontWeight: '700', fontSize: 15 },
    aliasPickBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.pill, paddingHorizontal: 14, paddingVertical: 8 },
    aliasPickBtnText: { color: '#fff', fontWeight: '700', fontSize: 12.5 },
    childCard: {
      marginHorizontal: SPACING.lg, marginBottom: 10, padding: 14, backgroundColor: COLORS.surface,
      borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    childLabel: { color: COLORS.text, fontWeight: '700', fontSize: 15 },
    childMeta: { color: COLORS.textMuted, fontSize: 12, marginTop: 3 },
    addLocationBtn: {
      marginHorizontal: SPACING.lg, marginTop: 4, marginBottom: 30,
      borderWidth: 1, borderColor: COLORS.primary, borderStyle: 'dashed', borderRadius: RADIUS.md,
      paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
    },
    addLocationText: { color: COLORS.primary, fontWeight: '700' },
  }));

  const claimRoot = async (usernameId: string, label: string) => {
    if (!business) return;
    Alert.alert(
      'Set brand root alias',
      `Make @${label} your business's root brand alias? Franchise locations will be created beneath it.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setBusy(true);
            try {
              const res = await fetchApi('/franchises/brand-root', {
                method: 'POST',
                body: JSON.stringify({ businessId: business.id, usernameId }),
              });
              const d = await res.json();
              if (!res.ok) throw new Error(d.message || 'Could not set brand root');
              load();
            } catch (e: any) {
              Alert.alert('Error', e.message);
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.empty}><ActivityIndicator color={COLORS.primary} /></View>
      </SafeAreaView>
    );
  }

  if (!business) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={TYPOGRAPHY.h2}>My Franchises</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.empty}>
          <Ionicons name="storefront-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>
            Franchises are for verified businesses. Verify your business account first, then come back here to set up your brand and locations.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('VerifyAccount')}>
            <Text style={styles.primaryBtnText}>Verify my business</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!hierarchy?.parent) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={TYPOGRAPHY.h2}>My Franchises</Text>
          <View style={{ width: 36 }} />
        </View>
        {myAliases.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="ribbon-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>
              {business.name} is verified, but you need at least one personal alias free of any existing hierarchy to make it your brand's root — mint one first.
            </Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('MyUsernames')}>
              <Text style={styles.primaryBtnText}>Go to My Usernames</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>PICK {business.name.toUpperCase()}'S BRAND ROOT ALIAS</Text>
            <FlatList
              data={myAliases}
              keyExtractor={(a) => a.id}
              contentContainerStyle={{ paddingBottom: 40 }}
              renderItem={({ item }) => (
                <View style={styles.aliasPickCard}>
                  <Text style={styles.aliasPickLabel}>@{item.label}</Text>
                  <TouchableOpacity style={styles.aliasPickBtn} onPress={() => claimRoot(item.id, item.label)} disabled={busy}>
                    {busy ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.aliasPickBtnText}>Make root</Text>}
                  </TouchableOpacity>
                </View>
              )}
            />
          </>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h2}>My Franchises</Text>
        <View style={{ width: 36 }} />
      </View>

      <FlatList
        data={hierarchy.children}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListHeaderComponent={
          <>
            <View style={styles.rootCard}>
              <LinearGradient colors={['#CA8A04', '#713F12']} style={styles.rootGradient}>
                <Text style={styles.rootLabel}>@{hierarchy.parent.label}</Text>
                <Text style={styles.rootMeta}>Root brand alias · {business.name}</Text>
              </LinearGradient>
            </View>
            <Text style={styles.sectionLabel}>
              FRANCHISE LOCATIONS ({hierarchy.children.length})
            </Text>
          </>
        }
        ListFooterComponent={
          <TouchableOpacity
            style={styles.addLocationBtn}
            onPress={() => navigation.navigate('CreateFranchise', { businessId: business.id, parentUsernameId: hierarchy.parent.id, parentLabel: hierarchy.parent.label })}
          >
            <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
            <Text style={styles.addLocationText}>Add franchise location</Text>
          </TouchableOpacity>
        }
        ListEmptyComponent={
          <Text style={[styles.emptyText, { marginHorizontal: SPACING.lg, textAlign: 'left' }]}>
            No franchise locations yet — add one below.
          </Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.childCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('FranchiseStaff', { franchiseUsernameId: item.id, franchiseLabel: item.label })}
          >
            <View>
              <Text style={styles.childLabel}>@{item.label}</Text>
              <Text style={styles.childMeta}>
                {(item.staffRoster?.length ?? 0)} active staff{item.isActive ? ' · active alias' : ''}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}
