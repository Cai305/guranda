import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import AiWidgetRenderer from '../../components/ai-widgets/AiWidgetRenderer';
import { useAiConversation, AiBubble } from '../../context/AiConversationContext';
import ChatComposer from '../../components/chat/ChatComposer';

export default function AiChatScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const { COLORS, SPACING } = theme;
  const {
    agentName, agentExists, agentOnboarded, bubbles, thinking, pending,
    activeAgentId, sendMessage, resolveAction, addBubble, triggerWelcome,
  } = useAiConversation();
  const [input, setInput] = useState('');
  const welcomeChecked = useRef(false);
  const listRef = useRef<FlatList>(null);

  // Route to setup once we know there's no AiAgent yet. Otherwise, decide
  // ONCE per screen mount whether this visit should fire the onboarding
  // welcome — bubbles.length===0 means the shared session (which may
  // already hold history from a prior chat, voice session, or the
  // dropdown tray) genuinely has nothing yet, not just "this screen just mounted".
  useEffect(() => {
    if (agentExists === null || welcomeChecked.current) return;
    if (agentExists === false) {
      navigation.replace('AiSetup');
      return;
    }
    welcomeChecked.current = true;
    if (bubbles.length === 0) {
      if (route.params?.welcome || agentOnboarded === false) {
        triggerWelcome();
      } else {
        addBubble('assistant', `Hey, it's ${agentName}. What do you need?`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentExists, agentOnboarded]);

  useEffect(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, [bubbles.length]);

  const send = async () => {
    const text = input.trim();
    if (!text || thinking) return;
    setInput('');
    await sendMessage(text);
  };

  const renderBubble = ({ item }: { item: AiBubble }) => {
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
          <Text style={styles.aiReplyText} numberOfLines={4}>{item.text}</Text>
        </View>
        {item.widgets && item.widgets.length > 0 && (
          <AiWidgetRenderer widgets={item.widgets} navigation={navigation} />
        )}
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
      borderLeftWidth: 2,
      borderLeftColor: COLORS.primary,
      borderRadius: RADIUS.md,
      padding: SPACING.md,
    },
    aiReplyText: { color: COLORS.text, fontSize: 14, lineHeight: 19, fontWeight: '500' },
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
  }));

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
            <Text style={styles.headerName}>{activeAgentId ? `${activeAgentId.toUpperCase()} AI` : agentName}</Text>
            <Text style={styles.headerStatus}>{thinking ? 'thinking…' : (activeAgentId ? 'specialist active' : 'online')}</Text>
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
          keyExtractor={b => String(b.id)}
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
              <TouchableOpacity style={[styles.approvalBtn, styles.declineBtn]} onPress={() => resolveAction(false)}>
                <Text style={styles.declineText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.approvalBtn, styles.approveBtn]} onPress={() => resolveAction(true)}>
                <Text style={styles.approveText}>Approve</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <ChatComposer
          value={input}
          onChangeText={setInput}
          onSend={send}
          placeholder={`Message ${agentName}…`}
          sending={thinking}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
