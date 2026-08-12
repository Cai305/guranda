export type AccountType = 'PERSONAL' | 'CREATOR' | 'MERCHANT' | 'BUSINESS';

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  PERSONAL: 'Personal',
  CREATOR: 'Creator',
  MERCHANT: 'Merchant',
  BUSINESS: 'Business',
};

// Default framing, derived from how many mini apps someone actually owns —
// no manual setup required for most accounts. MERCHANT has no natural
// derivation rule (owning N shops doesn't necessarily mean "merchant" over
// "business"), so it's only reachable via the explicit override the backend
// already supports (GET/PATCH /business-insights/account-type).
export function deriveAccountType(installedMiniAppCount: number): AccountType {
  if (installedMiniAppCount <= 0) return 'PERSONAL';
  if (installedMiniAppCount <= 2) return 'CREATOR';
  return 'BUSINESS';
}
