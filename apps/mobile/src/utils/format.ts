export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
  return `${n}`;
}

// User-facing amounts are always shown in Rand — Masheleni/MSH stays the
// backend/technical name only (it's an XRPL stablecoin pegged 1:1 to the
// Rand, per docs/01_PRD.md), never surfaced to users. Mirrors the "R" the
// PayShap deposit flow already uses (wallets.service.ts) so the app has one
// currency convention, not two.
export function formatCurrency(amount: number): string {
  const n = Number(amount) || 0;
  return `R${n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
