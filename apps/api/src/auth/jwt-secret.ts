// Single source of truth for the JWT signing secret — both AuthModule (signs
// tokens) and JwtStrategy (verifies them) import this instead of each having
// their own `process.env.JWT_SECRET || '<hardcoded fallback>'` line. The old
// pattern meant the app booted "successfully" with a secret visible to
// anyone who reads this repo, silently forging-any-user levels of broken.
// Fail loudly at startup instead: a missing or known-weak secret should
// never let the process come up looking healthy.
const KNOWN_WEAK_DEFAULTS = new Set(['mxit-super-secret-key-for-dev']);

function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || KNOWN_WEAK_DEFAULTS.has(secret)) {
    throw new Error(
      'JWT_SECRET is missing or set to a known default — set a real random ' +
        'value in .env before starting the API. Generate one with: ' +
        `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`,
    );
  }
  return secret;
}

export const JWT_SECRET = resolveJwtSecret();
