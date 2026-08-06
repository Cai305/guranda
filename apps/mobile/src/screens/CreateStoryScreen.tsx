import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image, Alert,
  ActivityIndicator, Switch, PanResponder, Animated, Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { fetchApi, uploadImage, uploadMedia } from '../utils/api';

const BG_COLORS = [
  ['#7C3AED', '#4F46E5'],
  ['#DB2777', '#7C3AED'],
  ['#059669', '#0891B2'],
  ['#D97706', '#DC2626'],
  ['#1D4ED8', '#0891B2'],
  ['#111827', '#374151'],
];

const STICKER_PALETTE = ['🔥', '✨', '😂', '❤️', '👀', '🎉', '💯', '📸', '🌟', '👏', '😍', '🙌'];

interface WearingItem {
  id: string;
  name: string;
  brand: string;
  price: string;
  isForSale: boolean;
}

interface LinkedProduct {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  storeId: string;
  storeName: string;
}

interface PlacedSticker {
  id: string;
  emoji: string;
  pan: Animated.ValueXY;
}

export default function CreateStoryScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const { COLORS, SPACING } = theme;
  const [text, setText] = useState('');
  const [selectedBg, setSelectedBg] = useState(0);
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [postType, setPostType] = useState<'general' | 'ofTheDay'>('general');
  const [label, setLabel] = useState('');
  const [items, setItems] = useState<WearingItem[]>([]);

  const [musicUri, setMusicUri] = useState<string | null>(null);
  const [musicName, setMusicName] = useState<string | null>(null);
  const [musicMimeType, setMusicMimeType] = useState<string | null>(null);

  const [stickers, setStickers] = useState<PlacedSticker[]>([]);
  const previewSize = useRef({ width: 1, height: 1 });

  // ── Linked products (shoppable story) ──────────────────────
  const [linkedProducts, setLinkedProducts] = useState<LinkedProduct[]>([]);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [productResults, setProductResults] = useState<any[]>([]);
  const [productSearchLoading, setProductSearchLoading] = useState(false);

  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, RADIUS, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    backBtn: { padding: 4 },
    headerTitle: { ...TYPOGRAPHY.h2, fontSize: 18 },
    postBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 18, paddingVertical: 8, borderRadius: RADIUS.pill },
    postBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    preview: {
      margin: SPACING.lg,
      borderRadius: RADIUS.xl,
      height: 280,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
      position: 'relative',
    },
    previewImage: { ...StyleSheet.absoluteFill },
    previewTextWrap: { backgroundColor: 'rgba(0,0,0,0.35)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: RADIUS.lg },
    previewText: { color: '#fff', fontSize: 22, fontWeight: '700', textAlign: 'center' },
    previewPlaceholder: { color: 'rgba(255,255,255,0.55)', fontSize: 16, fontStyle: 'italic' },
    stickerWrap: { position: 'absolute', top: 0, left: 0 },
    stickerEmoji: { fontSize: 36 },
    musicBadge: {
      position: 'absolute', top: 12, left: 12, right: 60,
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: RADIUS.pill,
      paddingHorizontal: 8, paddingVertical: 4,
    },
    musicBadgeText: { color: '#fff', fontSize: 11, flexShrink: 1 },
    expiryBadge: {
      position: 'absolute', bottom: 12, right: 12,
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: RADIUS.pill,
      paddingHorizontal: 8, paddingVertical: 4,
    },
    expiryText: { color: 'rgba(255,255,255,0.8)', fontSize: 11 },
    section: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.lg },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
    label: { ...TYPOGRAPHY.body2, color: COLORS.textMuted, marginBottom: SPACING.sm, textTransform: 'uppercase', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
    hint: { ...TYPOGRAPHY.caption, color: COLORS.textMuted, marginTop: 6 },
    segmentRow: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: 4, gap: 4 },
    segment: { flex: 1, paddingVertical: 10, borderRadius: RADIUS.sm, alignItems: 'center' },
    segmentActive: { backgroundColor: COLORS.primary },
    segmentText: { color: COLORS.textMuted, fontWeight: '600', fontSize: 14 },
    segmentTextActive: { color: '#fff' },
    labelInput: {
      backgroundColor: COLORS.surface, color: COLORS.text, borderRadius: RADIUS.md,
      borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, fontSize: 16, fontWeight: '700',
    },
    textInput: {
      backgroundColor: COLORS.surface, color: COLORS.text, borderRadius: RADIUS.md,
      borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, fontSize: 16, minHeight: 80, textAlignVertical: 'top',
    },
    charCount: { ...TYPOGRAPHY.caption, textAlign: 'right', marginTop: 4, color: COLORS.textMuted },
    bgRow: { gap: SPACING.sm, paddingVertical: 4 },
    bgSwatch: { width: 42, height: 42, borderRadius: 21, padding: 3, borderWidth: 2, borderColor: 'transparent' },
    bgSwatchSelected: { borderColor: COLORS.text },
    bgSwatchInner: { flex: 1, borderRadius: 18 },
    photoBtn: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md },
    photoRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    photoThumb: { width: 36, height: 36, borderRadius: 8 },
    photoBtnText: { ...TYPOGRAPHY.body2, color: COLORS.secondary, flex: 1 },
    stickerRow: { gap: SPACING.sm, paddingVertical: 4 },
    stickerOption: {
      width: 44, height: 44, borderRadius: RADIUS.md, backgroundColor: COLORS.surface,
      borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center',
    },
    stickerOptionEmoji: { fontSize: 22 },
    addItemBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: 'rgba(139,92,246,0.12)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)',
      paddingHorizontal: 12, paddingVertical: 5, borderRadius: RADIUS.pill,
    },
    addItemText: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },
    itemCard: { backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder, borderRadius: RADIUS.md, padding: 14, marginBottom: 10 },
    itemCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    itemNumber: { color: COLORS.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
    itemInput: {
      backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm,
      paddingHorizontal: 12, paddingVertical: 10, color: COLORS.text, fontSize: 14,
    },
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
    switchLabel: { color: COLORS.text, fontSize: 14 },

    // Product squares in preview
    productSquaresRow: {
      position: 'absolute', bottom: 40, left: 12, right: 12,
      flexDirection: 'row', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap',
    },
    productSquare: { width: 60, height: 60, borderRadius: 14, overflow: 'visible', position: 'relative' },
    productSquareGrad: {
      width: 60, height: 60, borderRadius: 14,
      borderWidth: 2, borderColor: 'rgba(139,92,246,0.6)',
      justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
    },
    productSquareImg: { width: '100%', height: '100%', borderRadius: 12 },
    productSquarePricePill: {
      position: 'absolute', bottom: -8, left: 0, right: 0,
      backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 6,
      alignItems: 'center', paddingVertical: 2,
    },
    productSquarePriceText: { color: '#fff', fontSize: 9, fontWeight: '800' },
    productSquareClose: { position: 'absolute', top: -4, right: -4 },
    productSquareAdd: {
      width: 60, height: 60, borderRadius: 14, borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.3)', borderStyle: 'dashed',
      justifyContent: 'center', alignItems: 'center',
    },

    // Link products section
    linkProductsEmpty: { borderRadius: RADIUS.lg, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)' },
    linkProductsEmptyGrad: { padding: 16 },
    linkProductsEmptyInner: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    linkProductsEmptyIcon: { width: 46, height: 46, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
    linkProductsEmptyTitle: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
    linkProductsEmptyHint: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
    linkedProductRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.md,
      borderWidth: 1, borderColor: COLORS.border, padding: 12, marginBottom: 8,
    },
    linkedProductThumb: { width: 48, height: 48, borderRadius: RADIUS.sm, overflow: 'hidden' },
    linkedProductThumbImg: { width: 48, height: 48, borderRadius: RADIUS.sm, justifyContent: 'center', alignItems: 'center' },
    linkedProductName: { color: COLORS.text, fontWeight: '700', fontSize: 13 },
    linkedProductStore: { color: COLORS.textMuted, fontSize: 11 },
    linkedProductPrice: { color: COLORS.secondary, fontWeight: '800', fontSize: 13 },

    // Product search modal
    productSearchSheet: { flex: 1, backgroundColor: COLORS.surface },
    handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginTop: 10, marginBottom: 6 },
    productSearchHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
      borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    productSearchTitle: { ...TYPOGRAPHY.h2, fontSize: 17 },
    productSearchBar: {
      flexDirection: 'row', alignItems: 'center', gap: 8, margin: SPACING.lg,
      backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.pill,
      borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14, paddingVertical: 11,
    },
    productSearchInput: { flex: 1, color: COLORS.text, fontSize: 15 },
    productSearchEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
    productSearchEmptyText: { color: COLORS.textMuted, fontSize: 15 },
    productResultRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.lg,
      borderWidth: 1, borderColor: COLORS.border, padding: 12,
    },
    productResultThumb: { width: 52, height: 52, borderRadius: RADIUS.sm, overflow: 'hidden' },
    productResultThumbImg: { width: 52, height: 52, borderRadius: RADIUS.sm, justifyContent: 'center', alignItems: 'center' },
    productResultName: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
    productResultStore: { color: COLORS.textMuted, fontSize: 12 },
    productResultPrice: { color: COLORS.secondary, fontWeight: '800', fontSize: 14 },
    linkBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.pill, paddingHorizontal: 14, paddingVertical: 7 },
    linkBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  }));

  const searchProducts = async (q: string) => {
    if (!q.trim()) { setProductResults([]); return; }
    setProductSearchLoading(true);
    try {
      const res = await fetchApi(`/shopping/products?search=${encodeURIComponent(q)}`);
      const data = await res.json();
      setProductResults(Array.isArray(data) ? data : []);
    } catch { setProductResults([]); }
    setProductSearchLoading(false);
  };

  const linkProduct = (p: any) => {
    const lp: LinkedProduct = {
      id: p.id,
      name: p.name || 'Product',
      price: typeof p.price === 'number' ? p.price : parseFloat(p.price) || 0,
      imageUrl: p.imageUrl,
      storeId: p.storeId || p.store?.id || 'unknown',
      storeName: p.storeName || p.store?.name || 'Store',
    };
    if (!linkedProducts.find(x => x.id === lp.id)) {
      setLinkedProducts(prev => [...prev, lp]);
    }
    setShowProductSearch(false);
    setProductSearchQuery('');
    setProductResults([]);
  };

  const unlinkProduct = (id: string) => setLinkedProducts(prev => prev.filter(p => p.id !== id));

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.8,
    });
    if (!result.canceled) {
      setMediaUri(result.assets[0].uri);
    }
  };

  // A poster/photo built in the media editor, or handed back after editing
  // the currently-picked photo, arrives via these route params.
  useEffect(() => {
    if (route?.params?.prefilledImageUri) {
      setMediaUri(route.params.prefilledImageUri);
      navigation.setParams({ prefilledImageUri: undefined });
    }
  }, [route?.params?.prefilledImageUri]);

  useEffect(() => {
    if (route?.params?.editedImageUri) {
      setMediaUri(route.params.editedImageUri);
      navigation.setParams({ editedImageUri: undefined });
    }
  }, [route?.params?.editedImageUri]);

  const editPhoto = () => {
    if (!mediaUri) return;
    navigation.navigate('MediaEditor', {
      initialImageUri: mediaUri,
      mode: 'photo',
      aspectRatio: 9 / 16,
      returnScreen: 'CreateStory',
      returnParamKey: 'editedImageUri',
    });
  };

  const pickMusic = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*' });
    if (result.canceled) return;
    const asset = result.assets[0];
    setMusicUri(asset.uri);
    setMusicName(asset.name);
    setMusicMimeType(asset.mimeType ?? null);
  };

  const addSticker = (emoji: string) => {
    const pan = new Animated.ValueXY({ x: 120, y: 180 });
    setStickers(prev => [...prev, { id: Math.random().toString(36).slice(2), emoji, pan }]);
  };

  const removeSticker = (id: string) => {
    setStickers(prev => prev.filter(s => s.id !== id));
  };

  const addItem = () => {
    setItems(prev => [...prev, { id: Math.random().toString(36).slice(2), name: '', brand: '', price: '', isForSale: false }]);
  };
  const updateItem = (id: string, field: keyof WearingItem, value: string | boolean) => {
    setItems(prev => prev.map(item => (item.id === id ? { ...item, [field]: value } : item)));
  };
  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const publish = async () => {
    if (!text.trim() && !mediaUri) {
      Alert.alert('Add content', 'Please add some text or a photo.');
      return;
    }
    if (postType === 'ofTheDay' && !label.trim()) {
      Alert.alert('Add a label', 'Give your "of the Day" post a label — e.g. OOTD, COTD.');
      return;
    }
    setLoading(true);
    try {
      let mediaUrl: string | undefined;
      if (mediaUri) mediaUrl = await uploadImage(mediaUri);

      let uploadedMusicUrl: string | undefined;
      if (musicUri) {
        const { url } = await uploadMedia(musicUri, 'audio', {
          name: musicName ?? undefined,
          mimeType: musicMimeType ?? undefined,
        });
        uploadedMusicUrl = url;
      }

      const res = await fetchApi('/stories', {
        method: 'POST',
        body: JSON.stringify({
          textContent: text.trim() || undefined,
          mediaUrl,
          backgroundColor: JSON.stringify(BG_COLORS[selectedBg]),
          musicUrl: uploadedMusicUrl,
          musicTitle: musicName ?? undefined,
          label: postType === 'ofTheDay' ? label.trim() : undefined,
          stickers: stickers.map(s => ({
            emoji: s.emoji,
            // Percentage-based so the position holds up on the viewer's
            // full-screen layout, which is a different size than this preview.
            x: Math.max(0, Math.min(100, ((s.pan.x as any)._value / previewSize.current.width) * 100)),
            y: Math.max(0, Math.min(100, ((s.pan.y as any)._value / previewSize.current.height) * 100)),
            scale: 1,
            rotation: 0,
          })),
          items: postType === 'ofTheDay'
            ? items.filter(i => i.name.trim()).map(i => ({
                name: i.name,
                brand: i.brand || undefined,
                price: i.isForSale ? parseFloat(i.price) || undefined : undefined,
                isForSale: i.isForSale,
              }))
            : linkedProducts.length > 0
            ? linkedProducts.map(p => ({ name: p.name, brand: p.storeName, price: p.price, isForSale: true, productId: p.id, imageUrl: p.imageUrl }))
            : undefined,
        }),
      });
      if (res.ok) {
        Alert.alert('Posted!', postType === 'ofTheDay' ? `Your #${label.trim().toUpperCase()} is live for 24 hours.` : 'Your status is live for 24 hours.');
        navigation.goBack();
      } else {
        Alert.alert('Error', 'Could not post. Please try again.');
      }
    } catch {
      Alert.alert('Error', 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const previewColors = BG_COLORS[selectedBg] as [string, string];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="close" size={26} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Story</Text>
        <TouchableOpacity onPress={publish} style={styles.postBtn} disabled={loading}>
          {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.postBtnText}>Share</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}>
        {/* Preview card */}
        <LinearGradient
          colors={previewColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.preview}
          onLayout={e => { previewSize.current = { width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height }; }}
        >
          {mediaUri ? <Image source={{ uri: mediaUri }} style={styles.previewImage} resizeMode="cover" /> : null}
          {text ? (
            <View style={styles.previewTextWrap}>
              <Text style={styles.previewText}>{text}</Text>
            </View>
          ) : (
            !mediaUri && <Text style={styles.previewPlaceholder}>Your story will look like this ✨</Text>
          )}

          {stickers.map(s => {
            const panResponder = PanResponder.create({
              onStartShouldSetPanResponder: () => true,
              onPanResponderGrant: () => { (s.pan as any).setOffset({ x: (s.pan.x as any)._value, y: (s.pan.y as any)._value }); (s.pan as any).setValue({ x: 0, y: 0 }); },
              onPanResponderMove: Animated.event([null, { dx: s.pan.x, dy: s.pan.y }], { useNativeDriver: false }),
              onPanResponderRelease: () => { (s.pan as any).flattenOffset(); },
            });
            return (
              <Animated.View
                key={s.id}
                {...panResponder.panHandlers}
                style={[styles.stickerWrap, { transform: s.pan.getTranslateTransform() }]}
              >
                <TouchableOpacity onLongPress={() => removeSticker(s.id)} activeOpacity={0.8}>
                  <Text style={styles.stickerEmoji}>{s.emoji}</Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}

          {musicName && (
            <View style={styles.musicBadge}>
              <Ionicons name="musical-notes" size={12} color="#fff" />
              <Text style={styles.musicBadgeText} numberOfLines={1}>{musicName}</Text>
            </View>
          )}

          {/* Product squares overlay */}
          {linkedProducts.length > 0 && (
            <View style={styles.productSquaresRow}>
              {linkedProducts.map(p => (
                <TouchableOpacity key={p.id} style={styles.productSquare} onLongPress={() => unlinkProduct(p.id)} activeOpacity={0.85}>
                  <LinearGradient colors={['rgba(139,92,246,0.8)', 'rgba(99,102,241,0.8)']} style={styles.productSquareGrad}>
                    {p.imageUrl ? (
                      <Image source={{ uri: p.imageUrl }} style={styles.productSquareImg} resizeMode="cover" />
                    ) : (
                      <Ionicons name="bag-handle" size={18} color="rgba(255,255,255,0.8)" />
                    )}
                  </LinearGradient>
                  <View style={styles.productSquarePricePill}>
                    <Text style={styles.productSquarePriceText}>R {p.price.toFixed(0)}</Text>
                  </View>
                  <Ionicons name="close-circle" size={14} color="rgba(255,255,255,0.9)" style={styles.productSquareClose} />
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.productSquareAdd} onPress={() => setShowProductSearch(true)}>
                <Ionicons name="add" size={20} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.expiryBadge}>
            <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.8)" />
            <Text style={styles.expiryText}>Expires in 24h</Text>
          </View>
        </LinearGradient>

        {/* Post type toggle */}
        <View style={styles.section}>
          <Text style={styles.label}>Post as</Text>
          <View style={styles.segmentRow}>
            <TouchableOpacity
              style={[styles.segment, postType === 'general' && styles.segmentActive]}
              onPress={() => setPostType('general')}
            >
              <Text style={[styles.segmentText, postType === 'general' && styles.segmentTextActive]}>General Story</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segment, postType === 'ofTheDay' && styles.segmentActive]}
              onPress={() => setPostType('ofTheDay')}
            >
              <Text style={[styles.segmentText, postType === 'ofTheDay' && styles.segmentTextActive]}>Of the Day</Text>
            </TouchableOpacity>
          </View>
        </View>

        {postType === 'ofTheDay' && (
          <View style={styles.section}>
            <Text style={styles.label}>Label</Text>
            <TextInput
              style={styles.labelInput}
              placeholder="OOTD, COTD, FOTD..."
              placeholderTextColor={COLORS.textMuted}
              value={label}
              onChangeText={setLabel}
              autoCapitalize="characters"
              maxLength={24}
            />
            <Text style={styles.hint}>Anything works — this becomes a trending tag other people can discover.</Text>
          </View>
        )}

        {/* Text input */}
        <View style={styles.section}>
          <Text style={styles.label}>Add Text</Text>
          <TextInput
            style={styles.textInput}
            placeholder="What's on your mind?"
            placeholderTextColor={COLORS.textMuted}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={200}
          />
          <Text style={styles.charCount}>{text.length}/200</Text>
        </View>

        {/* Background picker */}
        {!mediaUri && (
          <View style={styles.section}>
            <Text style={styles.label}>Background</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bgRow}>
              {BG_COLORS.map((colors, i) => (
                <TouchableOpacity key={i} onPress={() => setSelectedBg(i)} style={[styles.bgSwatch, selectedBg === i && styles.bgSwatchSelected]}>
                  <LinearGradient colors={colors as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.bgSwatchInner} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Photo picker */}
        <View style={styles.section}>
          <Text style={styles.label}>Add Photo</Text>
          <TouchableOpacity style={styles.photoBtn} onPress={pickImage}>
            {mediaUri ? (
              <View style={styles.photoRow}>
                <Image source={{ uri: mediaUri }} style={styles.photoThumb} />
                <Text style={styles.photoBtnText}>Change photo</Text>
                <TouchableOpacity onPress={editPhoto} hitSlop={8}>
                  <Ionicons name="color-wand-outline" size={20} color={COLORS.secondary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setMediaUri(null)} hitSlop={8}>
                  <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.photoRow}>
                <Ionicons name="image-outline" size={22} color={COLORS.secondary} />
                <Text style={styles.photoBtnText}>Choose from gallery</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Music picker */}
        <View style={styles.section}>
          <Text style={styles.label}>Music</Text>
          <TouchableOpacity style={styles.photoBtn} onPress={pickMusic}>
            <View style={styles.photoRow}>
              <Ionicons name="musical-notes-outline" size={22} color={COLORS.secondary} />
              <Text style={styles.photoBtnText} numberOfLines={1}>{musicName ?? 'Add a song from your device'}</Text>
              {musicName && (
                <TouchableOpacity onPress={() => { setMusicUri(null); setMusicName(null); setMusicMimeType(null); }}>
                  <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Stickers */}
        <View style={styles.section}>
          <Text style={styles.label}>Stickers</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stickerRow}>
            {STICKER_PALETTE.map(emoji => (
              <TouchableOpacity key={emoji} style={styles.stickerOption} onPress={() => addSticker(emoji)}>
                <Text style={styles.stickerOptionEmoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {stickers.length > 0 && <Text style={styles.hint}>Drag to reposition · long-press to remove</Text>}
        </View>

        {/* Link Products */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.label}>Link Products</Text>
            <TouchableOpacity style={styles.addItemBtn} onPress={() => setShowProductSearch(true)}>
              <Ionicons name="bag-add" size={14} color={COLORS.primary} />
              <Text style={styles.addItemText}>Search products</Text>
            </TouchableOpacity>
          </View>
          {linkedProducts.length === 0 ? (
            <TouchableOpacity style={styles.linkProductsEmpty} onPress={() => setShowProductSearch(true)}>
              <LinearGradient colors={['rgba(139,92,246,0.08)', 'rgba(99,102,241,0.08)']} style={styles.linkProductsEmptyGrad}>
                <View style={styles.linkProductsEmptyInner}>
                  <LinearGradient colors={['#8B5CF6', '#6366F1']} style={styles.linkProductsEmptyIcon}>
                    <Ionicons name="bag-handle" size={22} color="#fff" />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.linkProductsEmptyTitle}>Add shoppable products</Text>
                    <Text style={styles.linkProductsEmptyHint}>Viewers can buy directly from your story</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <>
              {linkedProducts.map(p => (
                <View key={p.id} style={styles.linkedProductRow}>
                  <View style={styles.linkedProductThumb}>
                    {p.imageUrl ? (
                      <Image source={{ uri: p.imageUrl }} style={styles.linkedProductThumbImg} resizeMode="cover" />
                    ) : (
                      <LinearGradient colors={['#8B5CF6', '#6366F1']} style={styles.linkedProductThumbImg}>
                        <Ionicons name="bag-handle" size={16} color="rgba(255,255,255,0.6)" />
                      </LinearGradient>
                    )}
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.linkedProductName} numberOfLines={1}>{p.name}</Text>
                    <Text style={styles.linkedProductStore} numberOfLines={1}>{p.storeName}</Text>
                    <Text style={styles.linkedProductPrice}>R {p.price.toFixed(2)}</Text>
                  </View>
                  <TouchableOpacity onPress={() => unlinkProduct(p.id)} style={{ padding: 4 }}>
                    <Ionicons name="close-circle-outline" size={20} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={[styles.addItemBtn, { alignSelf: 'flex-start', marginTop: 8 }]} onPress={() => setShowProductSearch(true)}>
                <Ionicons name="add" size={14} color={COLORS.primary} />
                <Text style={styles.addItemText}>Add another</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Wearing / items — only for "of the Day" posts */}
        {postType === 'ofTheDay' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.label}>Wearing / Featuring</Text>
              <TouchableOpacity style={styles.addItemBtn} onPress={addItem}>
                <Ionicons name="add" size={14} color={COLORS.primary} />
                <Text style={styles.addItemText}>Add item</Text>
              </TouchableOpacity>
            </View>
            {items.map((item, index) => (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.itemCardHeader}>
                  <Text style={styles.itemNumber}>Item {index + 1}</Text>
                  <TouchableOpacity onPress={() => removeItem(item.id)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                    <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.itemInput}
                  placeholder="Item name (e.g. Red Sneakers)"
                  placeholderTextColor={COLORS.textMuted}
                  value={item.name}
                  onChangeText={t => updateItem(item.id, 'name', t)}
                />
                <TextInput
                  style={[styles.itemInput, { marginTop: 8 }]}
                  placeholder="Brand (optional)"
                  placeholderTextColor={COLORS.textMuted}
                  value={item.brand}
                  onChangeText={t => updateItem(item.id, 'brand', t)}
                />
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>List for sale</Text>
                  <Switch
                    value={item.isForSale}
                    onValueChange={v => updateItem(item.id, 'isForSale', v)}
                    trackColor={{ false: COLORS.border, true: COLORS.primary }}
                    thumbColor={COLORS.surface}
                  />
                </View>
                {item.isForSale && (
                  <TextInput
                    style={[styles.itemInput, { marginTop: 8 }]}
                    placeholder="Price (MSH)"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="numeric"
                    value={item.price}
                    onChangeText={t => updateItem(item.id, 'price', t)}
                  />
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Product Search Modal */}
      <Modal visible={showProductSearch} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowProductSearch(false)}>
        <View style={styles.productSearchSheet}>
          <View style={styles.handle} />
          <View style={styles.productSearchHeader}>
            <Text style={styles.productSearchTitle}>Link a Product</Text>
            <TouchableOpacity onPress={() => { setShowProductSearch(false); setProductSearchQuery(''); setProductResults([]); }}>
              <Ionicons name="close" size={22} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
          <View style={styles.productSearchBar}>
            <Ionicons name="search" size={16} color={COLORS.textMuted} />
            <TextInput
              style={styles.productSearchInput}
              placeholder="Search products..."
              placeholderTextColor={COLORS.textMuted}
              value={productSearchQuery}
              onChangeText={q => { setProductSearchQuery(q); searchProducts(q); }}
              autoFocus
            />
          </View>
          {productSearchLoading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 30 }} />
          ) : productResults.length === 0 ? (
            <View style={styles.productSearchEmpty}>
              <Ionicons name="bag-handle-outline" size={44} color={COLORS.textMuted} />
              <Text style={styles.productSearchEmptyText}>{productSearchQuery ? 'No products found' : 'Start typing to search'}</Text>
            </View>
          ) : (
            <FlatList
              data={productResults}
              keyExtractor={(item, i) => item.id || i.toString()}
              contentContainerStyle={{ padding: SPACING.lg, gap: 10 }}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.productResultRow} onPress={() => linkProduct(item)} activeOpacity={0.85}>
                  <View style={styles.productResultThumb}>
                    {item.imageUrl ? (
                      <Image source={{ uri: item.imageUrl }} style={styles.productResultThumbImg} resizeMode="cover" />
                    ) : (
                      <LinearGradient colors={['#8B5CF6', '#6366F1']} style={styles.productResultThumbImg}>
                        <Ionicons name="bag-handle" size={16} color="rgba(255,255,255,0.5)" />
                      </LinearGradient>
                    )}
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={styles.productResultName} numberOfLines={1}>{item.name || 'Product'}</Text>
                    <Text style={styles.productResultStore} numberOfLines={1}>{item.store?.name || item.storeName || 'Store'}</Text>
                    <Text style={styles.productResultPrice}>R {(typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0).toFixed(2)}</Text>
                  </View>
                  <View style={styles.linkBtn}>
                    <Text style={styles.linkBtnText}>Link</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}
