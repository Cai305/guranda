import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet,
  Animated, Dimensions, StatusBar, ScrollView, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer } from 'expo-audio';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { useShoppingCart } from '../context/ShoppingCartContext';
import ProductMiniCard, { ProductCardData } from '../components/cards/ProductMiniCard';
import { fetchApi } from '../utils/api';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const STORY_DURATION = 5000; // 5s per story

export default function StoryViewerScreen({ route, navigation }: any) {
  const { groups, initialGroupIndex = 0 } = route.params as {
    groups: { userId: string; user: any; stories: any[] }[];
    initialGroupIndex: number;
  };

  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  // Product sheet state
  const [selectedProduct, setSelectedProduct] = useState<ProductCardData | null>(null);
  const [productSheetVisible, setProductSheetVisible] = useState(false);
  const { addItem } = useShoppingCart();
  const { theme } = useTheme();
  const { GRADIENTS } = theme;
  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
    dimOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.2)' },
    progressContainer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
    progressRow: { flexDirection: 'row', gap: 4, paddingHorizontal: 12, paddingTop: 8 },
    progressTrack: { flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 2, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: '#fff', borderRadius: 2 },
    userRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6 },
    avatar: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: COLORS.primary },
    username: { color: '#fff', fontWeight: '700', fontSize: 15 },
    timeLeft: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
    textWrap: {
      position: 'absolute',
      bottom: '30%',
      left: 24,
      right: 24,
      backgroundColor: 'rgba(0,0,0,0.4)',
      borderRadius: 16,
      padding: 18,
    },
    storyText: { color: '#fff', fontSize: 22, fontWeight: '700', textAlign: 'center', lineHeight: 30 },
    sticker: { position: 'absolute', fontSize: 36, zIndex: 6 },
    tapZones: { ...StyleSheet.absoluteFill, flexDirection: 'row', zIndex: 5 },
    tapLeft: { flex: 1 },
    tapRight: { flex: 1 },
    groupDots: { position: 'absolute', bottom: 40, alignSelf: 'center', flexDirection: 'row', gap: 6, zIndex: 10 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
    dotActive: { backgroundColor: '#fff', width: 16 },

    // ── Product squares ────────────────────────────────────────
    productSquaresContainer: {
      position: 'absolute',
      bottom: 60,
      left: 0, right: 0,
      zIndex: 8,
      paddingLeft: 16,
    },
    productSquaresLabel: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      backgroundColor: 'rgba(0,0,0,0.5)', alignSelf: 'flex-start',
      borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4,
      marginBottom: 8,
    },
    productSquaresLabelText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    productSquaresRow: { gap: 10, paddingRight: 16 },
    productSquare: {
      alignItems: 'center',
      zIndex: 9,
    },
    productSquareRing: {
      width: 70, height: 70, borderRadius: 18,
      padding: 2.5,
    },
    productSquareInner: {
      flex: 1, borderRadius: 16, overflow: 'hidden',
      backgroundColor: COLORS.surface,
      justifyContent: 'center', alignItems: 'center',
    },
    productSquareImg: {
      width: '100%', height: '100%', borderRadius: 15,
      justifyContent: 'center', alignItems: 'center',
    },
    productSquarePill: {
      marginTop: 5, backgroundColor: 'rgba(0,0,0,0.7)',
      borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
      borderWidth: 1, borderColor: 'rgba(139,92,246,0.4)',
    },
    productSquarePillText: { color: '#fff', fontSize: 10, fontWeight: '800', maxWidth: 60 },

    // ── Product bottom sheet ──────────────────────────────────
    sheetOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end',
    },
    productSheet: {
      backgroundColor: COLORS.surface,
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: SPACING.lg, paddingBottom: 36,
      alignItems: 'center', gap: 16,
    },
    sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border, marginBottom: 4 },
    sheetTitle: { color: COLORS.text, fontWeight: '800', fontSize: 18, alignSelf: 'flex-start' },
    sheetCloseBtn: {
      width: '100%', paddingVertical: 14,
      borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.pill,
      alignItems: 'center',
    },
    sheetCloseBtnText: { color: COLORS.textMuted, fontWeight: '700', fontSize: 14 },
  }));

  const currentGroup = groups[groupIndex];
  const currentStory = currentGroup?.stories[storyIndex];

  // Reactive to currentStory.musicUrl changing — expo-audio's useAudioPlayer
  // reloads its source when the URL passed in changes across renders, same
  // convention as useLiveSound.ts's fixed-URL players elsewhere in the app.
  const musicPlayer = useAudioPlayer(currentStory?.musicUrl || undefined);
  useEffect(() => {
    if (!currentStory?.musicUrl) return;
    try {
      musicPlayer.seekTo(0);
      musicPlayer.play();
    } catch {
      // Audio may not be available on all platforms — fail silently
    }
    return () => {
      try { musicPlayer.pause(); } catch {}
    };
  }, [currentStory?.id, currentStory?.musicUrl]);

  const startProgress = () => {
    progress.setValue(0);
    animRef.current = Animated.timing(progress, {
      toValue: 1,
      duration: STORY_DURATION,
      useNativeDriver: false,
    });
    animRef.current.start(({ finished }) => {
      if (finished) advance();
    });
  };

  const advance = () => {
    animRef.current?.stop();
    const nextStory = storyIndex + 1;
    if (nextStory < currentGroup.stories.length) {
      setStoryIndex(nextStory);
    } else {
      const nextGroup = groupIndex + 1;
      if (nextGroup < groups.length) {
        setGroupIndex(nextGroup);
        setStoryIndex(0);
      } else {
        navigation.goBack();
      }
    }
  };

  const goBack = () => {
    animRef.current?.stop();
    if (storyIndex > 0) {
      setStoryIndex(storyIndex - 1);
    } else if (groupIndex > 0) {
      setGroupIndex(groupIndex - 1);
      setStoryIndex(0);
    }
  };

  useEffect(() => {
    startProgress();
    return () => animRef.current?.stop();
  }, [groupIndex, storyIndex]);

  // Records a view for "who viewed my status" — safe to call unconditionally
  // for every story opened here (the backend no-ops for PUBLIC stories and
  // for the author's own, so this only ever has an effect on someone else's
  // CONTACTS/Status story).
  useEffect(() => {
    if (!currentStory?.id) return;
    fetchApi(`/stories/${currentStory.id}/view`, { method: 'POST' }).catch(() => {});
  }, [currentStory?.id]);

  if (!currentStory) return null;

  const bgColors: [string, string] = currentStory.backgroundColor
    ? (JSON.parse(currentStory.backgroundColor) as [string, string])
    : ['#1A1A2E', '#16213E'];

  const displayName = currentGroup.user.profile?.displayName || currentGroup.user.username || 'User';
  const avatarUri = currentGroup.user.profile?.avatarUrl
    || `https://api.dicebear.com/7.x/avataaars/png?seed=${currentGroup.user.username}`;

  const timeLeft = () => {
    const exp = new Date(currentStory.expiresAt).getTime();
    const now = Date.now();
    const hoursLeft = Math.max(0, Math.round((exp - now) / 3600000));
    return hoursLeft === 0 ? 'Expires soon' : `${hoursLeft}h left`;
  };

  // Map story items to ProductCardData (best effort)
  const linkedProducts: ProductCardData[] = Array.isArray(currentStory.items)
    ? currentStory.items
        .filter((item: any) => item.isForSale && item.price)
        .map((item: any) => ({
          id: item.id || item.productId || Math.random().toString(36).slice(2),
          name: item.name || 'Product',
          price: typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0,
          imageUrl: item.imageUrl,
          storeId: item.storeId || 'story-store',
          storeName: item.brand || item.storeName || displayName,
        }))
    : [];

  const openProductSheet = (product: ProductCardData) => {
    setSelectedProduct(product);
    setProductSheetVisible(true);
    animRef.current?.stop(); // pause story while sheet is open
  };

  const closeProductSheet = () => {
    setProductSheetVisible(false);
    setSelectedProduct(null);
    // Resume story
    startProgress();
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar barStyle="light-content" />

      {/* Background */}
      {currentStory.mediaUrl ? (
        <Image source={{ uri: currentStory.mediaUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <LinearGradient colors={bgColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      )}

      {/* Dim overlay */}
      <View style={styles.dimOverlay} />

      {/* Progress bars */}
      <SafeAreaView style={styles.progressContainer}>
        <View style={styles.progressRow}>
          {currentGroup.stories.map((_, i) => (
            <View key={i} style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: i < storyIndex
                      ? '100%'
                      : i === storyIndex
                        ? progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
                        : '0%',
                  },
                ]}
              />
            </View>
          ))}
        </View>

        {/* User info */}
        <View style={styles.userRow}>
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
          <View style={{ flex: 1 }}>
            <Text style={styles.username}>{displayName}</Text>
            <Text style={styles.timeLeft}>{timeLeft()}</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Story text content */}
      {currentStory.textContent ? (
        <View style={styles.textWrap}>
          <Text style={styles.storyText}>{currentStory.textContent}</Text>
        </View>
      ) : null}

      {/* Stickers — percentage-based positions, scaled to this screen */}
      {Array.isArray(currentStory.stickers) && currentStory.stickers.map((sticker: any, i: number) => (
        <Text
          key={i}
          style={[
            styles.sticker,
            {
              left: (sticker.x / 100) * SCREEN_W,
              top: (sticker.y / 100) * SCREEN_H,
              transform: [{ scale: sticker.scale ?? 1 }, { rotate: `${sticker.rotation ?? 0}deg` }],
            },
          ]}
        >
          {sticker.emoji}
        </Text>
      ))}

      {/* ── Shoppable product squares ───────────────────────── */}
      {linkedProducts.length > 0 && (
        <View style={styles.productSquaresContainer}>
          <View style={styles.productSquaresLabel}>
            <Ionicons name="bag-handle" size={12} color="#fff" />
            <Text style={styles.productSquaresLabelText}>Tap to shop</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productSquaresRow}>
            {linkedProducts.map(product => (
              <TouchableOpacity
                key={product.id}
                style={styles.productSquare}
                onPress={() => openProductSheet(product)}
                activeOpacity={0.85}
              >
                {/* Purple gradient ring border */}
                <LinearGradient colors={['#8B5CF6', '#EC4899']} style={styles.productSquareRing}>
                  <View style={styles.productSquareInner}>
                    {product.imageUrl ? (
                      <Image source={{ uri: product.imageUrl }} style={styles.productSquareImg} resizeMode="cover" />
                    ) : (
                      <LinearGradient colors={GRADIENTS.primary} style={styles.productSquareImg}>
                        <Ionicons name="bag-handle" size={22} color="rgba(255,255,255,0.7)" />
                      </LinearGradient>
                    )}
                  </View>
                </LinearGradient>
                <View style={styles.productSquarePill}>
                  <Text style={styles.productSquarePillText} numberOfLines={1}>R {product.price.toFixed(0)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Tap zones */}
      <View style={styles.tapZones}>
        <TouchableOpacity style={styles.tapLeft} onPress={goBack} activeOpacity={1} />
        <TouchableOpacity style={styles.tapRight} onPress={advance} activeOpacity={1} />
      </View>

      {/* Group dots */}
      {groups.length > 1 && (
        <View style={styles.groupDots}>
          {groups.map((_, i) => (
            <View key={i} style={[styles.dot, i === groupIndex && styles.dotActive]} />
          ))}
        </View>
      )}

      {/* ── Product bottom sheet ───────────────────────────── */}
      <Modal
        visible={productSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={closeProductSheet}
      >
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={closeProductSheet}>
          <View style={styles.productSheet} onStartShouldSetResponder={() => true}>
            {/* Handle */}
            <View style={styles.sheetHandle} />

            {selectedProduct && (
              <>
                <Text style={styles.sheetTitle}>Shop this Product</Text>
                <ProductMiniCard
                  product={selectedProduct}
                  navigation={navigation}
                  onBuyNow={(p) => {
                    addItem(
                      { id: p.id, name: p.name, price: p.price, imageUrl: p.imageUrl, category: p.category },
                      p.storeId,
                      p.storeName,
                    );
                    closeProductSheet();
                    navigation.navigate('ShoppingCart');
                  }}
                />
              </>
            )}

            <TouchableOpacity style={styles.sheetCloseBtn} onPress={closeProductSheet}>
              <Text style={styles.sheetCloseBtnText}>Continue Watching</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
