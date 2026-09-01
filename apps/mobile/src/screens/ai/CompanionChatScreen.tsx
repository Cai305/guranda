import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  KeyboardAvoidingView, Platform, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';
import ChatComposer from '../../components/chat/ChatComposer';

// Real full-screen DM-style chat for the fixed platform personas (Sipho,
// Thandi, Guranda AI Assistant) — deliberately NOT the floating orb pattern
// used for the personal AiAgent: these are meant to feel like messaging an
// actual contact from the chat list, so a normal chat screen (with a plain
// back button, same as any other DM) is the right shape, not a widget.

interface Bubble {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
}

let bubbleId = 0;
const nextId = () => `companion-b${++bubbleId}`;

function friendlyErrorMessage(message?: string): string {
  if (!message) return 'Something went wrong. Please try again.';
  if (message.includes('AI provider error')) {
    console.error('AI provider error:', message);
    return "Couldn't reach the AI service right now. Please try again in a moment.";
  }
  return message;
}

export default function CompanionChatScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const { COLORS, SPACING } = theme;
  const companionId: string = route.params?.companionId;
  const companionName: string = route.params?.companionName || 'Chat';

  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const listRef = useRef<FlatList>(null);
  // Tracks which companion's history is currently loaded — not just "have we
  // ever loaded" — because React Navigation reuses this screen instance and
  // updates route.params in place when you navigate here while it's already
  // the focused route (e.g. tapping a different companion from the chat
  // list right after this one), rather than remounting. Without this, a
  // one-shot "initialized" flag would leave the previous companion's bubbles
  // on screen under the new companion's name/header.
  const loadedFor = useRef<string | null>(null);

  const addBubble = (role: Bubble['role'], text: string) => {
    if (!text) return;
    setBubbles(prev => [...prev, { id: nextId(), role, text }]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  };

  useEffect(() => {
    if (loadedFor.current === companionId || !companionId) return;
    loadedFor.current = companionId;
    setBubbles([]);
    setLoadingHistory(true);
    (async () => {
      try {
        const res = await fetchApi(`/ai/companions/${companionId}/history`);
        const history = res.ok ? await res.json() : [];
        if (Array.isArray(history) && history.length > 0) {
          setBubbles(history.map((m: any) => ({ id: nextId(), role: m.role, text: m.content })));
          setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 80);
        } else {
          addBubble('assistant', `Hey, it's ${companionName} 👋 What's on your mind?`);
        }
      } catch {
        addBubble('system', 'Could not reach your AI. Check that the API is running.');
      } finally {
        setLoadingHistory(false);
      }
    })();
  }, [companionId]);

  const send = async () => {
    const text = input.trim();
    if (!text || thinking || !companionId) return;
    setInput('');
    addBubble('user', text);
    setThinking(true);
    try {
      const res = await fetchApi(`/ai/companions/${companionId}/chat`, {
        method: 'POST',
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Chat request failed');
      addBubble('assistant', data.reply);
    } catch (e: any) {
      addBubble('system', friendlyErrorMessage(e.message));
    } finally {
      setThinking(false);
    }
  };

  const renderBubble = ({ item }: { item: Bubble }) => {
    if (item.role === 'system') {
      return <Text style={styles.systemText}>{item.text}</Text>;
    }
    const mine = item.role === 'user';
    return (
      <View style={[styles.bubble, mine ? styles.bubbleUser : styles.bubbleAi]}>
        <Text style={[styles.bubbleText, mine && { color: '#FFF' }]}>{item.text}</Text>
      </View>
    );
  };

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
    root: { flex: 1, backgroundColor: COLORS.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
      borderBottomWidth: 1, borderBottomColor: COLORS.glassBorder,
    },
    backBtn: {
      width: 40, height: 40, borderRadius: RADIUS.pill,
      backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
      justifyContent: 'center', alignItems: 'center',
    },
    headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.surface },
    headerName: { color: COLORS.text, fontWeight: '800', fontSize: 15 },
    headerStatus: { color: COLORS.success, fontSize: 11 },
    bubble: { maxWidth: '82%', borderRadius: RADIUS.lg, padding: 12 },
    bubbleUser: { alignSelf: 'flex-end', backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
    bubbleAi: {
      alignSelf: 'flex-start', backgroundColor: COLORS.surface,
      borderWidth: 1, borderColor: COLORS.glassBorder, borderBottomLeftRadius: 4,
    },
    bubbleText: { color: COLORS.text, fontSize: 14, lineHeight: 20 },
    systemText: { color: COLORS.textMuted, fontSize: 11.5, textAlign: 'center', marginVertical: 2 },
    thinkingRow: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingHorizontal: SPACING.lg, paddingBottom: 6 },
    thinkingText: { color: COLORS.textMuted, fontSize: 12 },
  }));

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Image
            source={{ uri: `https://api.dicebear.com/7.x/avataaars/png?seed=${companionName}` }}
            style={styles.avatar}
          />
          <View>
            <Text style={styles.headerName}>{companionName}</Text>
            <Text style={styles.headerStatus}>{thinking ? 'typing…' : 'online'}</Text>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {loadingHistory ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 30 }} />
        ) : (
          <FlatList
            ref={listRef}
            data={bubbles}
            keyExtractor={b => b.id}
            renderItem={renderBubble}
            contentContainerStyle={{ padding: SPACING.lg, gap: 10 }}
          />
        )}

        {thinking && (
          <View style={styles.thinkingRow}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.thinkingText}>{companionName} is typing…</Text>
          </View>
        )}

        <ChatComposer
          value={input}
          onChangeText={setInput}
          onSend={send}
          placeholder={`Message ${companionName}…`}
          sending={thinking}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
