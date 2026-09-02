// Retail barcode formats the phone camera scans for products — distinct
// from the 'qr' type used for the merchant's checkout QR.
export const PRODUCT_BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'] as const;
export const CHECKOUT_QR_TYPES = ['qr'] as const;

export type ScanToPayItem = {
  id: string;
  barcode: string;
  name: string;
  price: number;
  qty: number;
  lineTotal: number;
  matchedGroceryItem: string | null;
};

export type ScanToPayMerchant = {
  id: string;
  name: string;
  category: string;
  address?: string | null;
  stores: { id: string; name: string; address?: string | null }[];
};

export type ScanToPaySession = {
  id: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  budget: number | null;
  groceryList: { name: string; matched: boolean }[];
  merchant: { id: string; name: string; category: string };
  store: { id: string; name: string; address: string | null };
  items: ScanToPayItem[];
  subtotal: number;
  itemCount: number;
  remaining: number | null;
  createdAt: string;
};

export type ScanToPayReceipt = {
  id: string;
  status: 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED';
  merchant: { id: string; name: string };
  store: { id: string; name: string; address: string | null };
  subtotal: number;
  discount: number;
  fees: number;
  total: number;
  items: { barcode: string; name: string; price: number; qty: number }[];
  paidAt: string | null;
  createdAt: string;
  verifiedAt: string | null;
  flagged: boolean;
};

// A short, readable stand-in for the real uuid — "shown" ids in the UI
// (TXN-XXXXXX) without a separate stored field, per the receipt mockup.
export function shortId(id: string, prefix: string): string {
  return `${prefix}-${id.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
}

// Category icon for a scanned product, guessed from its name — the MVP has
// no product image API (brief §4 makes that explicitly optional), so this
// is an honest placeholder rather than a fake photo.
const ICON_RULES: [RegExp, string][] = [
  [/\begg/i, 'egg-outline'],
  [/\bbread|\bloaf|\bbun/i, 'restaurant-outline'],
  [/\bmilk|\byoghurt|\bcream/i, 'water-outline'],
  [/\bcheese/i, 'pizza-outline'],
  [/\bchocolate|\bsweet|\bcandy/i, 'ice-cream-outline'],
  [/\bcold drink|\bsoda|\bcola|\bjuice/i, 'wine-outline'],
  [/\bcoffee|\btea\b/i, 'cafe-outline'],
  [/\boil\b|\bcooking/i, 'flask-outline'],
  [/\bbeans?\b|\brice\b|\bpasta\b|\bcereal/i, 'nutrition-outline'],
  [/\bmeat|\bchicken|\bbeef|\bfish/i, 'fast-food-outline'],
  [/\bshirt|\bshoe|\bsneaker|\bjacket|\bjean/i, 'shirt-outline'],
  [/\btablet|\bmedicine|\bpill|\bvitamin/i, 'medkit-outline'],
];

export function productIcon(name: string): string {
  const match = ICON_RULES.find(([re]) => re.test(name));
  return match ? match[1] : 'cube-outline';
}
