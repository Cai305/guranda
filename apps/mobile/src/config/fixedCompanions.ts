// Chat-list ids for the platform's fixed companions — must match the
// FIXED_COMPANIONS ids in apps/api/src/ai-runtime/fixed-companions.ts.
// Distinct from the user's own personal AiAgent (reached via the floating
// orb / AI settings), which isn't in this list.
export const FIXED_COMPANION_IDS: Record<string, string> = {
  'ai-assistant': 'guranda-assistant',
  'ai-sipho': 'sipho',
  'ai-thandi': 'thandi',
};
