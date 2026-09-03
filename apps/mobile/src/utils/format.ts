// "Last seen 5m ago" / "yesterday" / "3mo ago" / a plain date once it's
// over a year old — mirrors the informal granularity most chat apps use
// rather than an exact timestamp.
export function formatLastSeen(iso: string | null): string {
  if (!iso) return 'Offline';
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Last seen just now';
  if (minutes < 60) return `Last seen ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Last seen ${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Last seen yesterday';
  if (days < 30) return `Last seen ${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `Last seen ${months}mo ago`;
  return `Last seen ${new Date(iso).toLocaleDateString()}`;
}

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
