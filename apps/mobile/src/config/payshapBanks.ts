// Display metadata for the banks Guranda's PayShap linking screen offers —
// the API only stores/validates bare bank ids (see apps/api/src/payshap/
// payshap-banks.ts); name/color/code are presentation-only and live here so
// every PayShap screen renders the same badge for the same bank id.
export interface PayShapBank {
  id: string;
  name: string;
  color: string;
  code: string;
}

export const PAYSHAP_BANKS: PayShapBank[] = [
  { id: 'capitec', name: 'Capitec', color: '#F87171', code: 'CAP' },
  { id: 'fnb', name: 'FNB', color: '#FBBF24', code: 'FNB' },
  { id: 'absa', name: 'ABSA', color: '#F472B6', code: 'ABSA' },
  { id: 'standardbank', name: 'Standard Bank', color: '#22D3EE', code: 'SBK' },
  { id: 'nedbank', name: 'Nedbank', color: '#FB923C', code: 'NED' },
  { id: 'africanbank', name: 'African Bank', color: '#8B5CF6', code: 'AFB' },
  { id: 'tymebank', name: 'TymeBank', color: '#60A5FA', code: 'TYME' },
];

export function payshapBank(id: string | null | undefined): PayShapBank | undefined {
  return PAYSHAP_BANKS.find((b) => b.id === id);
}
