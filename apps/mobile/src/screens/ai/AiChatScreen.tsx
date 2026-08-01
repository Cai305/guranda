import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '../../theme';
import { fetchApi } from '../../utils/api';
import AiWidgetRenderer, { ToolWidget } from '../../components/ai-widgets/AiWidgetRenderer';

interface Bubble {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  widgets?: ToolWidget[];
}

interface PendingAction {
  toolUseId: string;
  name: string;
  input: any;
  summary: string;
}

let bubbleId = 0;
const nextId = () => `b${++bubbleId}`;

// The backend surfaces raw Anthropic API error bodies (bad key, no credits,
// rate limits) inside "AI provider error: ..." so they're diagnosable in
// logs — but that raw JSON is meaningless to a user, so translate it here.
function friendlyErrorMessage(message?: string): string {
  if (!message) return 'Something went wrong. Please try again.';
  if (message.includes('AI provider error')) {
    console.error('AI provider error:', message);
    return "Aura can't reach the AI service right now. Please try again in a moment.";
  }
  return message;
}

export default function AiChatScreen({ navigation, route }: any) {
  const [agentName, setAgentName] = useState('AI');
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);
  // Raw Anthropic conversation — round-tripped to the server every turn
  const conversation = useRef<any[]>([]);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchApi('/ai/agent');
        const agent = res.ok ? await res.json() : null;
        if (!agent || agent.exists === false) {
          navigation.replace('AiSetup');
          return;
        }
        setAgentName(agent.name);
        if (route.params?.welcome || !agent.onboarded) {
          await runRequest('/ai/welcome', {});
        } else {
          const historyRes = await fetchApi('/ai/history');
          const history = historyRes.ok ? await historyRes.json() : [];
          if (history.length > 0) {
            setBubbles(history.map((m: any) => ({ id: nextId(), role: m.role, text: m.content })));
            setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 80);
          } else {
            addBubble('assistant', `Hey, it's ${agent.name}. What do you need?`);
          }
        }
      } catch {
        addBubble('system', 'Could not reach your AI. Check that the API is running.');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addBubble = (role: Bubble['role'], text: string, widgets?: ToolWidget[]) => {
    if (!text) return;
    setBubbles(prev => [...prev, { id: nextId(), role, text, widgets }]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  };

  const runRequest = async (endpoint: string, body: any) => {
    setThinking(true);
    setPending(null);
    try {
      const res = await fetchApi(endpoint, { method: 'POST', body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'AI request failed');
      conversation.current = data.conversation || conversation.current;
      addBubble('assistant', data.reply, data.widgets);
      if (data.pendingAction) setPending(data.pendingAction);
    } catch (e: any) {
      addBubble('system', friendlyErrorMessage(e.message));
    } finally {
      setThinking(false);
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || thinking) return;
    setInput('');
    addBubble('user', text);
    conversation.current = [...conversation.current, { role: 'user', content: text }];
    await runRequest('/ai/chat', { messages: conversation.current });
  };

  const resolve = async (approved: boolean) => {
    if (!pending) return;
    addBubble('system', approved ? `✅ You approved: ${pending.summary}` : `❌ You declined: ${pending.summary}`);
    const action = pending;
    setPending(null);
    await runRequest('/ai/resolve', {
      conversation: conversation.current,
      action,
      approved,
    });
  };

  const renderBubble = ({ item }: { item: Bubble }) => {
    if (item.role === 'system') {
      return <Text style={styles.systemText}>{item.text}</Text>;
    }
    // User messages stay a normal chat bubble — only the assistant's own
    // replies render as a widget card, matching the same visual language
    // (glass background, hairline border) as the structured tool-result
    // widgets below them, so a plain text answer and a product-list answer
    // read as the same kind of thing instead of "text" vs "widget".
    if (item.role === 'user') {
      return (
        <View style={[styles.bubble, styles.bubbleUser]}>
          <Text style={[styles.bubbleText, { color: '#FFF' }]}>{item.text}</Text>
        </View>
      );
    }
    return (
      <View>
        <View style={styles.aiWidgetCard}>
          <View style={styles.aiWidgetHeader}>
            <View style={styles.aiWidgetHeaderIcon}>
              <Ionicons name="sparkles" size={11} color="#FFF" />
            </View>
            <Text style={styles.aiWidgetLabel}>{agentName}</Text>
          </View>
          <Text style={styles.bubbleText}>{item.text}</Text>
        </View>
        {item.widgets && item.widgets.length > 0 && (
          <AiWidgetRenderer widgets={item.widgets} navigation={navigation} />
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.avatarOrb}>
            <Ionicons name="sparkles" size={16} color="#FFF" />
          </View>
          <View>
            <Text style={styles.headerName}>{agentName}</Text>
            <Text style={styles.headerStatus}>{thinking ? 'thinking…' : 'online'}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('AiSetup')}>
          <Ionicons name="settings-outline" size={18} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={listRef}
          data={bubbles}
          keyExtractor={b => b.id}
          renderItem={renderBubble}
          style={{ flex: 1, minHeight: 0 }}
          contentContainerStyle={{ padding: SPACING.lg, gap: 10 }}
          onContentSizeChange={() => {
            listRef.current?.scrollToEnd({ animated: true });
            setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 150);
          }}
        />

        {thinking && (
          <View style={styles.thinkingRow}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.thinkingText}>{agentName} is thinking…</Text>
          </View>
        )}

        {pending && (
          <View style={styles.approvalCard}>
            <View style={styles.approvalHeader}>
              <Ionicons name="shield-checkmark" size={18} color="#F59E0B" />
              <Text style={styles.approvalTitle}>Approval needed</Text>
            </View>
            <Text style={styles.approvalSummary}>{pending.summary}</Text>
            <View style={styles.approvalButtons}>
              <TouchableOpacity style={[styles.approvalBtn, styles.declineBtn]} onPress={() => resolve(false)}>
                <Text style={styles.declineText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.approvalBtn, styles.approveBtn]} onPress={() => resolve(true)}>
                <Text style={styles.approveText}>Approve</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder={`Message ${agentName}…`}
            placeholderTextColor={COLORS.textMuted}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={send}
            editable={!thinking}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || thinking) && { opacity: 0.4 }]}
            onPress={send}
            disabled={!input.trim() || thinking}
          >
            <Ionicons name="arrow-up" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  avatarOrb: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  headerName: { color: COLORS.text, fontWeight: '800', fontSize: 15 },
  headerStatus: { color: COLORS.success, fontSize: 11 },
  bubble: {
    maxWidth: '82%',
    borderRadius: RADIUS.lg,
    padding: 12,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  bubbleText: { color: COLORS.text, fontSize: 14, lineHeight: 20 },
  // Widget-card container for every assistant reply — same visual language
  // (glass fill, hairline border, RADIUS.md) as WidgetCard.tsx's tool-result
  // cards, so a plain-text answer and a product-list answer both read as
  // "a widget", not a chat bubble.
  aiWidgetCard: {
    alignSelf: 'stretch',
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  aiWidgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  aiWidgetHeaderIcon: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  aiWidgetLabel: {
    color: COLORS.textMuted,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  systemText: {
    color: COLORS.textMuted, fontSize: 11.5,
    textAlign: 'center', marginVertical: 2,
  },
  thinkingRow: {
    flexDirection: 'row', gap: 8, alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingBottom: 6,
  },
  thinkingText: { color: COLORS.textMuted, fontSize: 12 },
  approvalCard: {
    marginHorizontal: SPACING.lg, marginBottom: 8,
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.5)',
    borderRadius: RADIUS.lg,
    padding: 14,
  },
  approvalHeader: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  approvalTitle: { color: '#F59E0B', fontWeight: '800', fontSize: 13 },
  approvalSummary: { color: COLORS.text, fontSize: 13.5, marginTop: 8, lineHeight: 19 },
  approvalButtons: { flexDirection: 'row', gap: 10, marginTop: 12 },
  approvalBtn: {
    flex: 1, paddingVertical: 11,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
  },
  declineBtn: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.glassBorder },
  declineText: { color: COLORS.textMuted, fontWeight: '700' },
  approveBtn: { backgroundColor: COLORS.success },
  approveText: { color: '#04291B', fontWeight: '800' },
  inputRow: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-end',
    padding: SPACING.lg, paddingTop: 6,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.glassBorder,
    color: COLORS.text,
    paddingHorizontal: 14, paddingVertical: 10,
    maxHeight: 110, fontSize: 14,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
  },
});
