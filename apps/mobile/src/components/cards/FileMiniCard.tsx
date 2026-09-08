import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { shareRemoteFile, formatFileSize } from '../../utils/mediaExport';

export interface FileCardData {
  url: string;
  name: string;
  size: number;
  mimeType: string;
}

// Encode/decode helpers — mirror the __eventCard/__productCard pattern so
// ChatScreen's renderMessage can detect the payload type in one place.
export const FILE_CARD_TAG = '__fileCard';

export function encodeFileCard(data: FileCardData): string {
  return JSON.stringify({ [FILE_CARD_TAG]: true, ...data });
}

export function decodeFileCard(content: string): FileCardData | null {
  try {
    if (!content.includes(FILE_CARD_TAG)) return null;
    const parsed = JSON.parse(content);
    if (!parsed[FILE_CARD_TAG]) return null;
    const { [FILE_CARD_TAG]: _tag, ...rest } = parsed;
    return rest as FileCardData;
  } catch {
    return null;
  }
}

function iconForMimeType(mimeType: string): keyof typeof Ionicons.glyphMap {
  if (mimeType.includes('pdf')) return 'document-text-outline';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'document-outline';
  if (mimeType.includes('sheet') || mimeType.includes('excel') || mimeType.includes('csv')) return 'grid-outline';
  if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'archive-outline';
  return 'document-attach-outline';
}

// Available to both sides of the chat — nothing here checks who sent the
// message, unlike message editing/deletion which is sender-only.
export default function FileMiniCard({ file }: { file: FileCardData }) {
  const [busy, setBusy] = useState(false);

  const styles = useThemedStyles(({ COLORS, RADIUS }) => ({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: 'rgba(15,15,25,0.97)',
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: 'rgba(139,92,246,0.25)',
      padding: 12,
      minWidth: 230,
      maxWidth: 290,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: RADIUS.md,
      backgroundColor: 'rgba(139,92,246,0.14)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: { flex: 1, minWidth: 0 },
    name: { color: COLORS.text, fontWeight: '700', fontSize: 13 },
    meta: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
    shareBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(139,92,246,0.14)',
    },
  }));

  const handleOpen = () => Linking.openURL(file.url);

  const handleShare = async () => {
    setBusy(true);
    try { await shareRemoteFile(file.url, file.name); }
    finally { setBusy(false); }
  };

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={handleOpen}>
      <View style={styles.iconWrap}>
        <Ionicons name={iconForMimeType(file.mimeType)} size={20} color="#a78bfa" />
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{file.name}</Text>
        <Text style={styles.meta}>{formatFileSize(file.size)}</Text>
      </View>
      <TouchableOpacity style={styles.shareBtn} onPress={handleShare} disabled={busy} hitSlop={8}>
        {busy ? <ActivityIndicator size="small" color="#a78bfa" /> : <Ionicons name="share-outline" size={16} color="#a78bfa" />}
      </TouchableOpacity>
    </TouchableOpacity>
  );
}
