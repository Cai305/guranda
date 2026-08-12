import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Image, Alert, ActivityIndicator, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useAuth } from '../../context/AuthContext';
import { fetchApi } from '../../utils/api';
import { formatCurrency } from '../../utils/format';

const BODY_EMOJI: Record<string, string> = {
  HATCHBACK: '🚗', SEDAN: '🚘', SUV: '🚙', BAKKIE: '🛻', COUPE: '🏎️', VAN: '🚐',
};

export default function CarFindDetailScreen({ navigation, route }: any) {
  const { carId } = route.params || {};
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY, SPACING } = theme;
  const galleryWidth = width - SPACING.lg * 2;
  const [car, setCar] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
    root: { flex: 1, backgroundColor: '#160B2E' },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    },
    backBtn: {
      width: 40, height: 40, borderRadius: RADIUS.pill,
      backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
      justifyContent: 'center', alignItems: 'center',
    },
    heroImage: { height: 200, marginHorizontal: SPACING.lg, borderRadius: RADIUS.lg, justifyContent: 'center', alignItems: 'center' },
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
    price: { color: '#A78BFA', fontWeight: '800', fontSize: 22 },
    newPill: {
      backgroundColor: 'rgba(52,211,153,0.2)',
      borderWidth: 1, borderColor: 'rgba(52,211,153,0.6)',
      borderRadius: RADIUS.pill,
      paddingHorizontal: 10, paddingVertical: 3,
    },
    newPillText: { color: COLORS.success, fontSize: 10, fontWeight: '800' },
    specsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
    specItem: {
      width: '31%',
      backgroundColor: 'rgba(255,255,255,0.05)',
      borderRadius: RADIUS.md,
      borderWidth: 1, borderColor: COLORS.glassBorder,
      padding: 10,
    },
    specLabel: { color: COLORS.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
    specValue: { color: COLORS.text, fontSize: 13, fontWeight: '700', marginTop: 3 },
    address: { color: COLORS.text, fontSize: 14, marginTop: 16 },
    description: { color: COLORS.textMuted, fontSize: 13.5, lineHeight: 20, marginTop: 12 },
    sellerCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      marginTop: 20,
      backgroundColor: 'rgba(255,255,255,0.05)',
      borderRadius: RADIUS.lg,
      borderWidth: 1, borderColor: COLORS.glassBorder,
      padding: 12,
    },
    sellerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#4C1D95' },
    sellerName: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
    sellerRole: { color: COLORS.textMuted, fontSize: 11.5, marginTop: 2 },
    enquiryCard: {
      marginTop: 16,
      backgroundColor: 'rgba(167,139,250,0.08)',
      borderWidth: 1, borderColor: 'rgba(167,139,250,0.4)',
      borderRadius: RADIUS.lg,
      padding: 14,
    },
    enquiryTitle: { color: COLORS.text, fontWeight: '800', fontSize: 14 },
    enquiryInput: {
      marginTop: 10,
      backgroundColor: 'rgba(0,0,0,0.3)',
      borderRadius: RADIUS.md,
      borderWidth: 1, borderColor: COLORS.glassBorder,
      color: COLORS.text,
      padding: 12, fontSize: 13, minHeight: 70, textAlignVertical: 'top',
    },
    enquiryBtn: {
      flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center',
      marginTop: 12,
      backgroundColor: '#7C3AED',
      borderRadius: RADIUS.pill,
      paddingVertical: 12,
    },
    enquiryBtnText: { color: '#FFF', fontWeight: '800', fontSize: 13.5 },
    sentCard: {
      flexDirection: 'row', gap: 10, alignItems: 'center',
      marginTop: 16,
      backgroundColor: 'rgba(52,211,153,0.1)',
      borderWidth: 1, borderColor: 'rgba(52,211,153,0.4)',
      borderRadius: RADIUS.lg,
      padding: 14,
    },
    sentText: { color: COLORS.text, fontSize: 13, flex: 1, lineHeight: 18 },
  }));

  useEffect(() => {
    fetchApi(`/carfind/listings/${carId}`)
      .then(res => (res.ok ? res.json() : null))
      .then(setCar)
      .catch(() => {});
  }, [carId]);

  const isSeller = car?.seller?.id === user?.userId;

  const sendEnquiry = async () => {
    if (!message.trim()) return;
    try {
      setSending(true);
      const res = await fetchApi(`/carfind/listings/${carId}/enquiries`, {
        method: 'POST',
        body: JSON.stringify({ message: message.trim() }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Could not send enquiry');
      setMessage('');
      setSent(true);
    } catch (e: any) {
      Alert.alert('Enquiry failed', e.message);
    } finally {
      setSending(false);
    }
  };

  if (!car) {
    return (
      <SafeAreaView style={styles.root}>
        <ActivityIndicator style={{ marginTop: 60 }} color="#A78BFA" />
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
          <Text style={TYPOGRAPHY.h2} numberOfLines={1}>{car.title}</Text>
          <View style={{ width: 40 }} />
        </View>

        {car.images?.length > 0 ? (
          <View>
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.gallery}>
              {car.images.map((url: string, i: number) => (
                <Image key={i} source={{ uri: url }} style={[styles.galleryImage, { width: galleryWidth }]} />
              ))}
            </ScrollView>
            <View style={styles.galleryBadge}>
              <Ionicons name="images" size={12} color="#FFF" />
              <Text style={styles.galleryBadgeText}>{car.images.length} photos — swipe</Text>
            </View>
          </View>
        ) : (
          <LinearGradient colors={['#4C1D95', '#2E1065']} style={styles.heroImage}>
            <Text style={{ fontSize: 64 }}>{BODY_EMOJI[car.bodyType] || '🚗'}</Text>
          </LinearGradient>
        )}

        <View style={styles.body}>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatCurrency(car.price)}</Text>
            {car.condition === 'NEW' && (
              <View style={styles.newPill}><Text style={styles.newPillText}>NEW</Text></View>
            )}
          </View>

          <View style={styles.specsGrid}>
            <View style={styles.specItem}><Text style={styles.specLabel}>YEAR</Text><Text style={styles.specValue}>{car.year}</Text></View>
            <View style={styles.specItem}><Text style={styles.specLabel}>MILEAGE</Text><Text style={styles.specValue}>{car.mileage.toLocaleString()} km</Text></View>
            <View style={styles.specItem}><Text style={styles.specLabel}>TRANSMISSION</Text><Text style={styles.specValue}>{car.transmission}</Text></View>
            <View style={styles.specItem}><Text style={styles.specLabel}>FUEL</Text><Text style={styles.specValue}>{car.fuelType}</Text></View>
            <View style={styles.specItem}><Text style={styles.specLabel}>BODY TYPE</Text><Text style={styles.specValue}>{car.bodyType}</Text></View>
            <View style={styles.specItem}><Text style={styles.specLabel}>CONDITION</Text><Text style={styles.specValue}>{car.condition}</Text></View>
          </View>

          <Text style={styles.address}>
            <Ionicons name="location" size={13} color="#A78BFA" /> {car.location}
          </Text>
          {car.description && <Text style={styles.description}>{car.description}</Text>}

          <View style={styles.sellerCard}>
            <Image
              source={{ uri: car.seller?.profile?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/png?seed=${car.seller?.username}` }}
              style={styles.sellerAvatar}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.sellerName}>{car.seller?.profile?.displayName || car.seller?.username}</Text>
              <Text style={styles.sellerRole}>Seller · @{car.seller?.username}</Text>
            </View>
          </View>

          {!isSeller && (
            sent ? (
              <View style={styles.sentCard}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                <Text style={styles.sentText}>Enquiry sent — the seller can now reach out to you.</Text>
              </View>
            ) : (
              <View style={styles.enquiryCard}>
                <Text style={styles.enquiryTitle}>Interested in this car?</Text>
                <TextInput
                  style={styles.enquiryInput}
                  placeholder="Ask about availability, condition, or arrange a viewing…"
                  placeholderTextColor={COLORS.textMuted}
                  value={message}
                  onChangeText={setMessage}
                  multiline
                />
                <TouchableOpacity
                  style={[styles.enquiryBtn, !message.trim() && { opacity: 0.4 }]}
                  onPress={sendEnquiry}
                  disabled={!message.trim() || sending}
                >
                  {sending ? <ActivityIndicator color="#FFF" size="small" /> : (
                    <>
                      <Ionicons name="send" size={15} color="#FFF" />
                      <Text style={styles.enquiryBtnText}>Send enquiry</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
