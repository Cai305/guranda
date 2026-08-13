import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, FlatList, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';
import { navigate } from '../../navigation/navigationRef';
import AiWidgetRenderer, { ToolWidget } from '../ai-widgets/AiWidgetRenderer';

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
const nextId = () => `dropdown-b${++bubbleId}`;

// Same wire-level error the AI screen has to translate — see AiChatScreen.tsx.
function friendlyErrorMessage(message?: string): string {
  if (!message) return 'Something went wrong. Please try again.';
  if (message.includes('AI provider error')) {
    console.error('AI provider error:', message);
    return "Aura can't reach the AI service right now. Please try again in a moment.";
  }
  return message;
}

export interface AiChatDropdownHandle {
  /** Send text as if the user typed it — used to feed a transcribed voice command in. */
  sendText: (text: string) => void;
  /** Post a local-only system bubble (no server round-trip) — used for voice-capture notices. */
  addSystemMessage: (text: string) => void;
}

interface Props {
  onClose: () => void;
  /** Stretch to fill its container instead of the small popover's fixed 460px cap — used when hosted in the full-height tray sheet. */
  fill?: boolean;
}

const AiChatDropdown = forwardRef<AiChatDropdownHandle, Props>(function AiChatDropdown({ onClose, fill }, ref) {
  const [agentName, setAgentName] = useState('AI');
  const [needsSetup, setNeedsSetup] = useState(false);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const conversation = useRef<any[]>([]);
  const listRef = useRef<FlatList>(null);
  const initialized = useRef(false);

  const { theme } = useTheme();
  const { COLORS, SPACING } = theme;

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING, TYPOGRAPHY, SHADOW }) => ({
    // Note: `maxHeight` is intentionally only set here, not overridden in
    // panelFill below — RN's style-array merge skips keys whose override
    // value is `undefined` rather than clearing them, so a `maxHeight:
    // undefined` in panelFill would silently leave this 460 cap in place
    // and starve the flex:1 layout the tray depends on to reach its full height.
    panel: {
      width: '100%',
      maxHeight: 460,
      backgroundColor: COLORS.surfaceElevated,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: COLORS.glassBorder,
      overflow: 'hidden',
      ...SHADOW.glow,
    },
    panelFill: {
      flex: 1,
      // Actually overrides panel's 460 cap (unlike `undefined`, which RN's
      // style-array merge would silently ignore) — effectively uncapped so
      // flex:1 can size this to the tray's real height instead.
      maxHeight: 2000,
      // Transparent so the BlurView the tray wraps this in shows through —
      // the frosted-glass look comes from that blur layer, not a flat fill.
      backgroundColor: 'transparent',
      borderRadius: 0,
      borderWidth: 0,
      shadowOpacity: 0,
      elevation: 0,
    },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
      borderBottomWidth: 1, borderBottomColor: COLORS.glassBorder,
    },
    // flex:1 + minHeight:0 lets this shrink to whatever space the panel's
    // other (fixed-height) children leave within the 460px cap, then scroll
    // internally for anything beyond that — without minHeight:0, a flex child
    // refuses to shrink below its content's natural size and the panel's
    // overflow:hidden just clips it instead of letting it scroll.
    list: { flex: 1, minHeight: 0 },
    headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    avatarOrb: {
      width: 26, height: 26, borderRadius: 13,
      backgroundColor: COLORS.primary,
      justifyContent: 'center', alignItems: 'center',
    },
    headerName: { color: COLORS.text, fontWeight: '800', fontSize: 13 },
    headerStatus: { color: COLORS.success, fontSize: 10 },
    iconBtn: {
      width: 30, height: 30, borderRadius: RADIUS.pill,
      backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
      justifyContent: 'center', alignItems: 'center',
    },
    bubble: { maxWidth: '85%', borderRadius: RADIUS.md, padding: 10 },
    bubbleUser: { alignSelf: 'flex-end', backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
    bubbleText: { color: COLORS.text, fontSize: 13, lineHeight: 18 },
    aiWidgetCard: {
      alignSelf: 'stretch',
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.glassBorder,
      borderRadius: RADIUS.md,
      borderLeftWidth: 2,
      borderLeftColor: COLORS.primary,
      padding: 10,
    },
    aiReplyText: { color: COLORS.text, fontSize: 13, lineHeight: 17, fontWeight: '500' },
    aiWidgetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 6,
    },
    aiWidgetHeaderIcon: {
      width: 18, height: 18, borderRadius: 9,
      backgroundColor: COLORS.primary,
      justifyContent: 'center', alignItems: 'center',
    },
    aiWidgetLabel: {
      color: COLORS.textMuted,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    systemText: { color: COLORS.textMuted, fontSize: 11, textAlign: 'center', marginVertical: 2 },
    thinkingRow: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingHorizontal: SPACING.md, paddingBottom: 6 },
    thinkingText: { color: COLORS.textMuted, fontSize: 11 },
    approvalCard: {
      marginHorizontal: SPACING.md, marginBottom: 8,
      backgroundColor: 'rgba(245,158,11,0.1)',
      borderWidth: 1, borderColor: 'rgba(245,158,11,0.5)',
      borderRadius: RADIUS.md, padding: 10,
    },
    approvalHeader: { flexDirection: 'row', gap: 6, alignItems: 'center' },
    approvalTitle: { color: '#F59E0B', fontWeight: '800', fontSize: 12 },
    approvalSummary: { color: COLORS.text, fontSize: 12.5, marginTop: 6, lineHeight: 17 },
    approvalButtons: { flexDirection: 'row', gap: 8, marginTop: 10 },
    approvalBtn: { flex: 1, paddingVertical: 9, borderRadius: RADIUS.pill, alignItems: 'center' },
    declineBtn: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.glassBorder },
    declineText: { color: COLORS.textMuted, fontWeight: '700', fontSize: 12.5 },
    approveBtn: { backgroundColor: COLORS.success },
    approveText: { color: '#04291B', fontWeight: '800', fontSize: 12.5 },
    inputRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end', padding: SPACING.md, paddingTop: 6 },
    input: {
      flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
      borderWidth: 1, borderColor: COLORS.glassBorder, color: COLORS.text,
      paddingHorizontal: 12, paddingVertical: 8, maxHeight: 90, fontSize: 13,
    },
    sendBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
    },
    setupCard: { padding: SPACING.lg, alignItems: 'center', gap: 8 },
    setupTitle: { ...TYPOGRAPHY.h4, textAlign: 'center' },
    setupBody: { ...TYPOGRAPHY.body2, textAlign: 'center', fontSize: 12.5 },
    setupBtn: {
      marginTop: 6, backgroundColor: COLORS.primary,
      paddingHorizontal: 20, paddingVertical: 10, borderRadius: RADIUS.pill,
    },
    setupBtnText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
  }));

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

  const sendText = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || thinking) return;
    addBubble('user', trimmed);
    conversation.current = [...conversation.current, { role: 'user', content: trimmed }];
    runRequest('/ai/chat', { messages: conversation.current });
  };

  useImperativeHandle(ref, () => ({
    sendText,
    addSystemMessage: (text: string) => addBubble('system', text),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [thinking]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    (async () => {
      try {
        const res = await fetchApi('/ai/agent');
        const agent = res.ok ? await res.json() : null;
        if (!agent || agent.exists === false) {
          setNeedsSetup(true);
          return;
        }
        setAgentName(agent.name);
        if (!agent.onboarded) {
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

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    sendText(text);
  };

  const resolve = async (approved: boolean) => {
    if (!pending) return;
    addBubble('system', approved ? `✅ You approved: ${pending.summary}` : `❌ You declined: ${pending.summary}`);
    const action = pending;
    setPending(null);
    await runRequest('/ai/resolve', { conversation: conversation.current, action, approved });
  };

  const goToSetup = () => {
    onClose();
    navigate('AiSetup');
  };

  const renderBubble = ({ item }: { item: Bubble }) => {
    if (item.role === 'system') {
      return <Text style={styles.systemText}>{item.text}</Text>;
    }
    if (item.role === 'user') {
      return (
        <View style={[styles.bubble, styles.bubbleUser]}>
          <Text style={[styles.bubbleText, { color: '#FFF' }]}>{item.text}</Text>
        </View>
      );
    }
    // Assistant replies render as a widget card — same visual language
    // (surface bg, hairline border) as the structured tool-result widgets
    // below them, so plain text and product-list answers read as one thing.
    return (
      <View>
        <View style={styles.aiWidgetCard}>
          <View style={styles.aiWidgetHeader}>
            <View style={styles.aiWidgetHeaderIcon}>
              <Ionicons name="sparkles" size={10} color="#FFF" />
            </View>
            <Text style={styles.aiWidgetLabel}>{agentName}</Text>
          </View>
          <Text style={styles.aiReplyText} numberOfLines={4}>{item.text}</Text>
        </View>
        {item.widgets && item.widgets.length > 0 && (
          <AiWidgetRenderer widgets={item.widgets} navigation={{ navigate }} />
        )}
      </View>
    );
  };

  return (
    <View style={[styles.panel, fill && styles.panelFill]}>
      <View style={styles.header}>
        <View style={styles.headerCenter}>
          <View style={styles.avatarOrb}>
            <Ionicons name="sparkles" size={14} color="#FFF" />
          </View>
          <View>
            <Text style={styles.headerName}>{agentName}</Text>
            <Text style={styles.headerStatus}>{thinking ? 'thinking…' : 'online'}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TouchableOpacity style={styles.iconBtn} onPress={goToSetup} accessibilityLabel="AI settings">
            <Ionicons name="settings-outline" size={16} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={onClose} accessibilityLabel="Close">
            <Ionicons name="close" size={18} color={COLORS.text} />
          </TouchableOpacity>
        </View>
      </View>

      {needsSetup ? (
        <View style={styles.setupCard}>
          <Ionicons name="sparkles-outline" size={28} color={COLORS.primary} />
          <Text style={styles.setupTitle}>Set up your AI companion</Text>
          <Text style={styles.setupBody}>Give it a name and personality to start chatting or issuing voice commands.</Text>
          <TouchableOpacity style={styles.setupBtn} onPress={goToSetup}>
            <Text style={styles.setupBtnText}>Get started</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            ref={listRef}
            data={bubbles}
            keyExtractor={b => b.id}
            renderItem={renderBubble}
            style={styles.list}
            contentContainerStyle={{ padding: SPACING.md, gap: 8 }}
            onContentSizeChange={() => {
              // Widget card rows can settle their height a tick after this first
              // fires (nested horizontal ScrollView measurement), so scrollToEnd
              // once more shortly after to actually reach the new bottom.
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
                <Ionicons name="shield-checkmark" size={16} color="#F59E0B" />
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
              <Ionicons name="arrow-up" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
});

export default AiChatDropdown;
