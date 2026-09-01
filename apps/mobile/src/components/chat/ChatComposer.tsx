import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { VemojiType } from '@mxit2/types';
import EmojiPicker from '../EmojiPicker';
import GifPicker from '../GifPicker';
import VemojiPicker from '../VemojiPicker';
import CustomEmoji from '../live/CustomEmoji';

// The single message-composer bar used by ChatScreen (private/group/channel
// chat) — every other real-time chat-style surface in the app (AI chat, live
// stream comments, MoonBase rooms, card-game room chat) renders this same
// component instead of a bespoke input row, so the compose experience is
// identical everywhere text gets typed and sent. Callers opt into only the
// capabilities their backend actually supports: omitting onPickImage /
// onCaptureImage / onToggleRecording / onSelectVemoji / onSelectGif simply
// hides that button rather than wiring up something that can't work.
export interface ChatComposerProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  placeholder?: string;
  sending?: boolean;
  onSelectVemoji?: (type: VemojiType) => void;
  onSelectGif?: (url: string) => void;
  onPickImage?: () => void;
  onCaptureImage?: () => void;
  isRecording?: boolean;
  onToggleRecording?: () => void;
  onCancelRecording?: () => void;
  uploading?: boolean;
  extraButtons?: React.ReactNode;
}

export default function ChatComposer({
  value,
  onChangeText,
  onSend,
  placeholder = 'Message',
  sending = false,
  onSelectVemoji,
  onSelectGif,
  onPickImage,
  onCaptureImage,
  isRecording = false,
  onToggleRecording,
  onCancelRecording,
  uploading = false,
  extraButtons,
}: ChatComposerProps) {
  const { theme } = useTheme();
  const { COLORS } = theme;
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showVemojiPicker, setShowVemojiPicker] = useState(false);

  const closeAllPickers = () => {
    setShowEmojiPicker(false);
    setShowGifPicker(false);
    setShowVemojiPicker(false);
  };

  const styles = useThemedStyles(({ COLORS }) => ({
    inputContainer: {
      flexDirection: 'row',
      padding: 10,
      alignItems: 'flex-end',
      gap: 8,
      backgroundColor: COLORS.background,
    },
    inputPill: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.surface,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: COLORS.border,
      paddingLeft: 8,
      paddingRight: 6,
    },
    pillIconBtn: {
      padding: 3,
      justifyContent: 'center',
      alignItems: 'center',
    },
    pillIconBtnLast: {
      paddingRight: 0,
    },
    gifButtonText: {
      color: COLORS.textMuted,
      fontSize: 9.5,
      fontWeight: '800',
      borderWidth: 1.3,
      borderColor: COLORS.textMuted,
      borderRadius: 4,
      paddingHorizontal: 3,
      paddingVertical: 1,
    },
    input: {
      flex: 1,
      color: COLORS.text,
      paddingVertical: 10,
      paddingHorizontal: 6,
      fontSize: 15,
      maxHeight: 100,
    },
    sendButton: {
      backgroundColor: COLORS.primary,
      width: 46,
      height: 46,
      borderRadius: 23,
      justifyContent: 'center',
      alignItems: 'center',
    },
    recordingBar: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 10,
      gap: 10,
      backgroundColor: COLORS.background,
    },
    recordingCancelBtn: {
      padding: 10,
    },
    recordingIndicator: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: COLORS.surface,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: COLORS.border,
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    recordingDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: '#EF4444',
    },
    recordingText: {
      color: COLORS.text,
      fontSize: 14,
    },
    recordingSendBtn: {
      backgroundColor: COLORS.primary,
      width: 46,
      height: 46,
      borderRadius: 23,
      justifyContent: 'center',
      alignItems: 'center',
    },
  }));

  if (isRecording) {
    return (
      <View style={styles.recordingBar}>
        <TouchableOpacity onPress={onCancelRecording} style={styles.recordingCancelBtn}>
          <Ionicons name="trash-outline" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>
        <View style={styles.recordingIndicator}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>Recording…</Text>
        </View>
        <TouchableOpacity onPress={onToggleRecording} style={styles.recordingSendBtn}>
          <Ionicons name="send" size={18} color="#FFF" />
        </TouchableOpacity>
      </View>
    );
  }

  const canRecord = !!onToggleRecording;
  const showSendIcon = !!value.trim() || !canRecord;

  return (
    <>
      <View style={styles.inputContainer}>
        <View style={styles.inputPill}>
          <TouchableOpacity
            style={styles.pillIconBtn}
            onPress={() => { setShowEmojiPicker((v) => !v); setShowGifPicker(false); setShowVemojiPicker(false); }}
          >
            <Ionicons name={showEmojiPicker ? 'close-circle' : 'happy-outline'} size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor={COLORS.textMuted}
            value={value}
            onChangeText={onChangeText}
            onSubmitEditing={onSend}
            multiline
          />
          {!!onSelectVemoji && (
            <TouchableOpacity
              style={styles.pillIconBtn}
              onPress={() => { setShowVemojiPicker((v) => !v); setShowEmojiPicker(false); setShowGifPicker(false); }}
            >
              {showVemojiPicker ? (
                <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
              ) : (
                <CustomEmoji type="fire" size={18} />
              )}
            </TouchableOpacity>
          )}
          {!!onSelectGif && (
            <TouchableOpacity
              style={styles.pillIconBtn}
              onPress={() => { setShowGifPicker((v) => !v); setShowEmojiPicker(false); setShowVemojiPicker(false); }}
            >
              {showGifPicker ? (
                <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
              ) : (
                <Text style={styles.gifButtonText}>GIF</Text>
              )}
            </TouchableOpacity>
          )}
          {!!onPickImage && (
            <TouchableOpacity style={styles.pillIconBtn} onPress={onPickImage} disabled={uploading}>
              <Ionicons name="attach" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
          {!!onCaptureImage && (
            <TouchableOpacity style={[styles.pillIconBtn, styles.pillIconBtnLast]} onPress={onCaptureImage} disabled={uploading}>
              <Ionicons name="camera-outline" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
          {extraButtons}
        </View>

        <TouchableOpacity
          style={styles.sendButton}
          onPress={showSendIcon ? onSend : onToggleRecording}
          disabled={uploading || sending}
        >
          {uploading || sending ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Ionicons name={showSendIcon ? 'send' : 'mic'} size={20} color="#FFF" />
          )}
        </TouchableOpacity>
      </View>

      {showEmojiPicker && (
        <EmojiPicker onSelect={(emoji) => onChangeText(value + emoji)} />
      )}
      {showVemojiPicker && !!onSelectVemoji && (
        <VemojiPicker onSelect={(type) => { onSelectVemoji(type); closeAllPickers(); }} />
      )}
      {showGifPicker && !!onSelectGif && (
        <GifPicker onSelect={(url) => { onSelectGif(url); closeAllPickers(); }} />
      )}
    </>
  );
}
