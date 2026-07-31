// Every response leaving this API passes through this — see
// strip-sensitive.interceptor.ts, registered globally in app.module.ts.
//
// Why a response-level strip instead of scoping every Prisma `include` with
// a `select`: an audit for this fix (docs/ARCHITECTURE_RECOMMENDATIONS.md #6)
// found the `user: { include: { profile: true } }` — no explicit `select` —
// pattern in 11 service files (video, posts, chat, ride, wallets, story,
// property, entertainment, finance, health, admin), most returning the
// Prisma result straight through to the client. `select`-scoping each site
// individually risks silently dropping a field some other part of the same
// method actually reads (e.g. posts.service.ts's ranking reads
// `author.locationLat` from the same object) — a mistake there fails
// invisibly. Stripping the *response* instead can never break internal
// logic, since everything upstream still sees the real Prisma result; it
// only touches what leaves the process, and it catches every controller —
// present and future — with no per-file opt-in required.
const SENSITIVE_KEYS = new Set([
  'passwordHash',
  // XRPL wallet seed — funds-controlling private key material, at least as
  // sensitive as passwordHash. Legitimate internal use (signing, in
  // finance.service.ts/xrpl.service.ts) never returns the value to a
  // controller, so stripping it here has no functional cost.
  'encryptedSeed',
]);

export function stripSensitiveDeep<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map(stripSensitiveDeep) as unknown as T;
  }
  if (value instanceof Date) return value;
  if (typeof value !== 'object') return value;
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) {
    // Not a plain object (e.g. Buffer, Prisma.Decimal) — leave untouched.
    return value;
  }
  const clone: any = {};
  for (const [key, val] of Object.entries(value as any)) {
    if (SENSITIVE_KEYS.has(key)) continue;
    clone[key] = stripSensitiveDeep(val);
  }
  return clone as T;
}
