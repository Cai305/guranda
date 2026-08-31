import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { fetchApi } from '../utils/api';
import { useAuth } from './AuthContext';
import { AI_ENABLED } from '../config/featureFlags';
import { ToolWidget } from '../components/ai-widgets/AiWidgetRenderer';
import { fulfillDeviceTool } from '../utils/deviceToolFulfillment';

export interface AiBubble {
  id: number;
  role: 'user' | 'assistant' | 'system';
  text: string;
  widgets?: ToolWidget[];
}

export interface AiPendingAction {
  toolUseId: string;
  toolName: string;
  input: any;
  summary: string;
}

interface AiConversationContextValue {
  agentName: string;
  /** null = still checking; false = no AiAgent set up yet (route to AiSetup). */
  agentExists: boolean | null;
  /** Whether this agent has been through its first-conversation welcome —
   * null until agentExists resolves true. AiChatScreen uses this (OR its own
   * route param) to decide whether to fire triggerWelcome(). */
  agentOnboarded: boolean | null;
  bubbles: AiBubble[];
  thinking: boolean;
  pending: AiPendingAction | null;
  activeAgentId: string | null;
  /** Returns the assistant's reply text (null on error) — HandsFreeOverlay
   * uses this to know what to speak, since it has no bubble UI of its own. */
  sendMessage: (text: string) => Promise<string | null>;
  resolveAction: (approved: boolean) => Promise<void>;
  addBubble: (role: AiBubble['role'], text: string, widgets?: ToolWidget[]) => void;
  /** First conversation after setup — call once, when the caller decides
   * onboarding is due (AiChatScreen does, based on its own route params). */
  triggerWelcome: () => Promise<void>;
  refreshAgent: () => Promise<void>;
}

const AiConversationContext = createContext<AiConversationContextValue | null>(null);

export function useAiConversation() {
  const ctx = useContext(AiConversationContext);
  if (!ctx) throw new Error('useAiConversation must be used within AiConversationProvider');
  return ctx;
}

let bubbleSeq = 0;
const nextBubbleId = () => ++bubbleSeq;

// The backend surfaces raw Anthropic API error bodies (bad key, no credits,
// rate limits) inside "AI provider error: ..." so they're diagnosable in
// logs — but that raw JSON is meaningless to a user, so translate it here.
function friendlyErrorMessage(message?: string): string {
  if (!message) return 'Something went wrong. Please try again.';
  if (message.includes('AI provider error')) {
    console.error('AI provider error:', message);
    return "I can't reach the AI service right now. Please try again in a moment.";
  }
  return message;
}

// Mounted once at the app root (see App.tsx, just outside AiOrbProvider so
// both AiOrbProvider's children — AiChatDropdown, HandsFreeOverlay — and
// AiChatScreen (deep inside RootNavigator) share it). This is the single
// source of truth for the AI conversation: bubbles, the widget the user is
// currently looking at (via selectedIndex on a bubble's widgets), and
// pending-approval state. Before this existed each of the three surfaces
// kept its own local state — a product-list shown in the text chat was
// invisible, and un-actionable by "next"/"the second one", from voice mode
// or the dropdown tray, which directly broke the "voice and touch control
// the same stateful system" requirement (docs/18 §8). See
// docs/19_AI_Engine_Audit_And_Design.md §6.2 / §16.3.
export function AiConversationProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [agentName, setAgentName] = useState('AI');
  const [agentExists, setAgentExists] = useState<boolean | null>(null);
  const [agentOnboarded, setAgentOnboarded] = useState<boolean | null>(null);
  const [bubbles, setBubbles] = useState<AiBubble[]>([]);
  const [thinking, setThinking] = useState(false);
  const [pending, setPending] = useState<AiPendingAction | null>(null);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  // Raw Anthropic-shaped conversation — round-tripped to the server every
  // turn, distinct from `bubbles` (the UI's own render model).
  const conversation = useRef<any[]>([]);
  const initialized = useRef(false);

  const addBubble = useCallback((role: AiBubble['role'], text: string, widgets?: ToolWidget[]) => {
    if (!text) return;
    setBubbles(prev => [...prev, { id: nextBubbleId(), role, text, widgets }]);
  }, []);

  // Applies a direct-dispatch result (WidgetActionResolverService, server —
  // "next"/"the second one" resolved with no LLM call, no new widget data)
  // to whichever earlier bubble rendered that toolCallId.
  const applyWidgetSelection = useCallback((selection: { toolCallId: string; selectedIndex: number }) => {
    setBubbles(prev => prev.map(b => {
      if (!b.widgets?.some(w => w.toolCallId === selection.toolCallId)) return b;
      return {
        ...b,
        widgets: b.widgets!.map(w =>
          w.toolCallId === selection.toolCallId ? { ...w, selectedIndex: selection.selectedIndex } : w
        ),
      };
    }));
  }, []);

  const runRequest = useCallback(async (endpoint: string, body: any): Promise<string | null> => {
    setThinking(true);
    setPending(null);
    try {
      const res = await fetchApi(endpoint, { method: 'POST', body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'AI request failed');
      conversation.current = data.conversation || conversation.current;
      addBubble('assistant', data.reply, data.widgets);
      if (data.widgetSelection) applyWidgetSelection(data.widgetSelection);
      if (data.pendingAction) setPending(data.pendingAction);
      setActiveAgentId(data.activeAgent?.id || null);
      return data.reply ?? null;
    } catch (e: any) {
      addBubble('system', friendlyErrorMessage(e.message));
      return null;
    } finally {
      setThinking(false);
    }
  }, [addBubble, applyWidgetSelection]);

  const sendMessage = useCallback(async (text: string): Promise<string | null> => {
    const trimmed = text.trim();
    if (!trimmed || thinking) return null;
    addBubble('user', trimmed);
    conversation.current = [...conversation.current, { role: 'user', content: trimmed }];
    return runRequest('/ai/chat', { messages: conversation.current });
  }, [thinking, addBubble, runRequest]);

  const resolveAction = useCallback(async (approved: boolean) => {
    if (!pending) return;
    let action = pending;
    setPending(null);

    // device.* tools (contacts/calendar/photos) read or write data that
    // only exists on the phone, not in Guranda's DB — the actual native
    // Expo call happens here, right after approval, and its result is
    // attached to action.input.deviceData before the resolve round-trip.
    // See apps/api/src/device/device-ai-tools.provider.ts.
    if (approved && action.toolName.startsWith('device.')) {
      addBubble('system', `✅ You approved: ${action.summary}`);
      try {
        const input = await fulfillDeviceTool(action.toolName, action.input);
        action = { ...action, input };
      } catch {
        addBubble('system', "Couldn't access that on your device — check the app's permission settings.");
        await runRequest('/ai/resolve', { conversation: conversation.current, action, approved: false });
        return;
      }
    } else {
      addBubble('system', approved ? `✅ You approved: ${action.summary}` : `❌ You declined: ${action.summary}`);
    }

    await runRequest('/ai/resolve', { conversation: conversation.current, action, approved });
  }, [pending, addBubble, runRequest]);

  const triggerWelcome = useCallback(async () => {
    await runRequest('/ai/welcome', {});
    setAgentOnboarded(true); // server marks AiAgent.onboarded=true on this same call
  }, [runRequest]);

  const refreshAgent = useCallback(async () => {
    try {
      const res = await fetchApi('/ai/agent');
      const agent = res.ok ? await res.json() : null;
      if (!agent || agent.exists === false) {
        setAgentExists(false);
        return;
      }
      setAgentExists(true);
      setAgentName(agent.name || 'AI');
      setAgentOnboarded(!!agent.onboarded);
    } catch {
      addBubble('system', 'Could not reach your AI. Check that the API is running.');
    }
  }, [addBubble]);

  // Bootstrap once, on first authenticated mount: agent identity + real
  // conversation history, so the shared session has continuity across app
  // restarts, not just within whichever surface happens to be open.
  useEffect(() => {
    if (!isAuthenticated || !AI_ENABLED || initialized.current) return;
    initialized.current = true;
    (async () => {
      await refreshAgent();
      const historyRes = await fetchApi('/ai/history').catch(() => null);
      const history = historyRes?.ok ? await historyRes.json() : [];
      if (Array.isArray(history) && history.length > 0) {
        setBubbles(history.map((m: any) => ({ id: nextBubbleId(), role: m.role, text: m.content })));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const value: AiConversationContextValue = {
    agentName,
    agentExists,
    agentOnboarded,
    bubbles,
    thinking,
    pending,
    activeAgentId,
    sendMessage,
    resolveAction,
    addBubble,
    triggerWelcome,
    refreshAgent,
  };

  return (
    <AiConversationContext.Provider value={value}>
      {children}
    </AiConversationContext.Provider>
  );
}
