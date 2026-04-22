/**
 * Who may call `resetDb` (destructive). Comma-separated emails (Firebase ID token `email` claim).
 * If unset in production, reset is denied. In non-production, unset allows any authenticated email
 * (still requires admin Basic auth on `/api/admin`).
 */
export function isEmailAllowedToResetDatabase(
  email: string | undefined,
): boolean {
  if (!email || !email.trim()) {
    return false;
  }
  const normalized = email.trim().toLowerCase();
  const raw = process.env.CHARMR_RESET_DB_ALLOWLIST;
  if (raw === undefined || raw === '') {
    return process.env.NODE_ENV !== 'production';
  }
  const allowed = raw
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(normalized);
}
