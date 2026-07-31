import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image, Alert,
  ActivityIndicator, Switch, PanResponder, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../theme';
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

interface PlacedSticker {
  id: string;
  emoji: string;
  pan: Animated.ValueXY;
}

export default function CreateStoryScreen({ navigation }: any) {
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
                <TouchableOpacity onPress={() => setMediaUri(null)}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
});
