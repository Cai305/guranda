import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Image, Alert, ActivityIndicator, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useAuth } from '../../context/AuthContext';
import { fetchApi } from '../../utils/api';

const KIND_EMOJI: Record<string, string> = { HOUSE: '🏡', APARTMENT: '🏢', COMMERCIAL: '🏬' };

export default function PropertyDetailScreen({ navigation, route }: any) {
  const { propertyId } = route.params || {};
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY, SPACING } = theme;
  const galleryWidth = width - SPACING.lg * 2;
  const [property, setProperty] = useState<any>(null);
  const [tenantUsername, setTenantUsername] = useState('');
  const [assigning, setAssigning] = useState(false);
  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
    root: { flex: 1, backgroundColor: '#07211E' },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    },
    backBtn: {
      width: 40, height: 40, borderRadius: RADIUS.pill,
      backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
      justifyContent: 'center', alignItems: 'center',
    },
    heroImage: {
      height: 200, marginHorizontal: SPACING.lg,
      borderRadius: RADIUS.lg,
      justifyContent: 'center', alignItems: 'center',
    },
    gallery: { marginHorizontal: SPACING.lg, borderRadius: RADIUS.lg, height: 220 },
    galleryImage: { height: 220, borderRadius: RADIUS.lg },
    galleryBadge: {
      position: 'absolute', bottom: 10, right: SPACING.lg + 10,
      flexDirection: 'row', gap: 5, alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.65)',
      borderRadius: RADIUS.pill,
      paddingHorizontal: 9, paddingVertical: 4,
    },
    galleryBadgeText: { color: '#FFF', fontSize: 10.5, fontWeight: '700' },
    body: { padding: SPACING.lg },
    priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    price: { color: '#2DD4BF', fontWeight: '800', fontSize: 20 },
    typePill: {
      backgroundColor: 'rgba(45,212,191,0.2)',
      borderWidth: 1, borderColor: 'rgba(45,212,191,0.6)',
      borderRadius: RADIUS.pill,
      paddingHorizontal: 10, paddingVertical: 3,
    },
    typePillText: { color: '#2DD4BF', fontSize: 10, fontWeight: '800' },
    address: { color: COLORS.text, fontSize: 14, marginTop: 10 },
    beds: { color: COLORS.textMuted, fontSize: 13, marginTop: 6 },
    description: { color: COLORS.textMuted, fontSize: 13.5, lineHeight: 20, marginTop: 12 },
    agentCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      marginTop: 20,
      backgroundColor: 'rgba(255,255,255,0.05)',
      borderRadius: RADIUS.lg,
      borderWidth: 1, borderColor: COLORS.glassBorder,
      padding: 12,
    },
    agentAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#134E4A' },
    agentName: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
    agentRole: { color: COLORS.textMuted, fontSize: 11.5, marginTop: 2 },
    chatBtn: {
      width: 38, height: 38, borderRadius: 19,
      backgroundColor: '#0D9488',
      justifyContent: 'center', alignItems: 'center',
    },
    assignCard: {
      marginTop: 16,
      backgroundColor: 'rgba(45,212,191,0.08)',
      borderWidth: 1, borderColor: 'rgba(45,212,191,0.4)',
      borderRadius: RADIUS.lg,
      padding: 14,
    },
    assignTitle: { color: COLORS.text, fontWeight: '800', fontSize: 14 },
    assignSub: { color: COLORS.textMuted, fontSize: 12, marginTop: 4, lineHeight: 17 },
    assignRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
    assignInput: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.3)',
      borderRadius: RADIUS.pill,
      borderWidth: 1, borderColor: COLORS.glassBorder,
      color: COLORS.text,
      paddingHorizontal: 14, paddingVertical: 9,
      fontSize: 13,
    },
    assignBtn: {
      backgroundColor: '#0D9488',
      borderRadius: RADIUS.pill,
      paddingHorizontal: 18,
      justifyContent: 'center',
    },
    assignBtnText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
  }));

  useEffect(() => {
    fetchApi(`/property/${propertyId}`)
      .then(res => (res.ok ? res.json() : null))
      .then(setProperty)
      .catch(() => {});
  }, [propertyId]);

  const isAgent = property?.agent?.id === user?.userId;

  const assign = async () => {
    if (!tenantUsername.trim()) return;
    try {
      setAssigning(true);
      const res = await fetchApi(`/property/${propertyId}/tenancy`, {
        method: 'POST',
        body: JSON.stringify({ tenantUsername: tenantUsername.trim() }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Could not assign tenant');
      Alert.alert('Tenant assigned', `@${tenantUsername.trim()} is now your tenant. Manage rent and issues in My Properties.`);
      navigation.navigate('MyProperties');
    } catch (e: any) {
      Alert.alert('Assign failed', e.message);
    } finally {
      setAssigning(false);
    }
  };

  if (!property) {
    return (
      <SafeAreaView style={styles.root}>
        <ActivityIndicator style={{ marginTop: 60 }} color="#2DD4BF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={TYPOGRAPHY.h2} numberOfLines={1}>{property.title}</Text>
          <View style={{ width: 40 }} />
        </View>

        {property.images?.length > 0 ? (
          <View>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.gallery}
            >
              {property.images.map((url: string, i: number) => (
                <Image key={i} source={{ uri: url }} style={[styles.galleryImage, { width: galleryWidth }]} />
              ))}
            </ScrollView>
            <View style={styles.galleryBadge}>
              <Ionicons name="images" size={12} color="#FFF" />
              <Text style={styles.galleryBadgeText}>{property.images.length} photos — swipe</Text>
            </View>
          </View>
        ) : (
          <LinearGradient colors={['#134E4A', '#0B2E2B']} style={styles.heroImage}>
            <Text style={{ fontSize: 64 }}>{KIND_EMOJI[property.kind] || '🏠'}</Text>
          </LinearGradient>
        )}

        <View style={styles.body}>
          <View style={styles.priceRow}>
            <Text style={styles.price}>
              {property.price} MSH{property.listingType === 'RENT' ? ' / month' : ''}
            </Text>
            <View style={styles.typePill}>
              <Text style={styles.typePillText}>
                {property.listingType === 'SALE' ? 'FOR SALE' : 'TO RENT'}
              </Text>
            </View>
          </View>
          <Text style={styles.address}>
            <Ionicons name="location" size={13} color="#2DD4BF" /> {property.address}
          </Text>
          {property.kind !== 'COMMERCIAL' && (
            <Text style={styles.beds}>🛏 {property.bedrooms} bedrooms · 🛁 {property.bathrooms} bathrooms</Text>
          )}
          {property.description && <Text style={styles.description}>{property.description}</Text>}

          <View style={styles.agentCard}>
            <Image
              source={{ uri: property.agent?.profile?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/png?seed=${property.agent?.username}` }}
              style={styles.agentAvatar}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.agentName}>{property.agent?.profile?.displayName || property.agent?.username}</Text>
              <Text style={styles.agentRole}>Estate agent · @{property.agent?.username}</Text>
            </View>
            {!isAgent && (
              <TouchableOpacity
                style={styles.chatBtn}
                onPress={() => navigation.navigate('Main', { screen: 'Chat' })}
              >
                <Ionicons name="chatbubble" size={16} color="#FFF" />
              </TouchableOpacity>
            )}
          </View>

          {isAgent && property.available && property.listingType === 'RENT' && (
            <View style={styles.assignCard}>
              <Text style={styles.assignTitle}>Assign a tenant</Text>
              <Text style={styles.assignSub}>
                Move a Guranda user in — rent tracking, receipts and the lease are generated automatically.
              </Text>
              <View style={styles.assignRow}>
                <TextInput
                  style={styles.assignInput}
                  placeholder="tenant username"
                  placeholderTextColor={COLORS.textMuted}
                  value={tenantUsername}
                  onChangeText={setTenantUsername}
                  autoCapitalize="none"
                />
                <TouchableOpacity style={styles.assignBtn} onPress={assign} disabled={assigning}>
                  {assigning ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.assignBtnText}>Assign</Text>}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
