/** Single source of "now". `EXPO_PUBLIC_FAKE_NOW` freezes it (used by e2e and screenshots). */
let override: Date | null = null;

export function setNow(d: Date | null) {
  override = d;
}

export function now(): Date {
  if (override) return new Date(override.getTime());
  const fake = process.env.EXPO_PUBLIC_FAKE_NOW;
  if (fake) {
    const d = new Date(fake);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

export const nowIso = () => now().toISOString();
