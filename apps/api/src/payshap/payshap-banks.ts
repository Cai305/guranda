// The banks Guranda's PayShap linking screen offers — the mobile client owns
// the display metadata (name/color/code) for these same ids; this list is
// only the server-side whitelist so a bad bankId is rejected up front
// instead of silently stored.
export const PAYSHAP_BANK_IDS = [
  'capitec',
  'fnb',
  'absa',
  'standardbank',
  'nedbank',
  'africanbank',
  'tymebank',
] as const;

export type PayShapBankId = (typeof PAYSHAP_BANK_IDS)[number];
