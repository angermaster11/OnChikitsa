/**
 * Normalisation helpers. Consistent normalisation is essential for uniqueness
 * guarantees (a phone/email must map to exactly one stored form) and reliable
 * lookups.
 */

/** Lowercase + trim an email for storage and comparison. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Normalise a phone number to a compact canonical form: keep a leading `+`
 * (E.164 country prefix) if present and strip all non-digits. This is a
 * pragmatic normalisation — full E.164 validation happens in Zod schemas.
 */
export function normalizePhone(phone: string): string {
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  return hasPlus ? `+${digits}` : digits;
}
