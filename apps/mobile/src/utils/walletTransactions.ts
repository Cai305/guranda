export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  SEND: 'Sent',
  RECEIVE: 'Received',
  PAYMENT: 'Payment',
  DEPOSIT: 'Deposit',
  STORY_LIKE: 'Story like',
  STORY_COMMENT: 'Story comment',
  STORY_RANK: 'Story ranking',
  STORY_ITEM_SALE: 'Item sale',
  EAT_ORDER_PAYOUT: 'Food order payout',
  SHOPPING_ORDER_PAYOUT: 'Shopping order payout',
  VIDEO_REWARD_FUND: 'Video reward fund',
  VIDEO_REWARD_PAYOUT: 'Video reward payout',
  SCAN_TO_PAY_PAYOUT: 'Scan to Pay sale',
};

export function humanizeTransactionType(type: string): string {
  if (TRANSACTION_TYPE_LABELS[type]) return TRANSACTION_TYPE_LABELS[type];
  return type.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
}

// Matches the exact set the transaction list has always colored green — the
// dashboard's Money In total is computed server-side over this same set
// (see wallets.service.ts's getWalletSummary), so the two never disagree.
export function isPositiveTransactionType(type: string): boolean {
  return type === 'RECEIVE' || type === 'DEPOSIT';
}

export function transactionIcon(type: string): string {
  if (type === 'RECEIVE' || type === 'DEPOSIT') return 'arrow-down-circle-outline';
  if (type === 'SEND') return 'arrow-up-circle-outline';
  return 'cart-outline';
}
