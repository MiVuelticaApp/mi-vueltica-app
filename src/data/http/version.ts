import { API_BASE, USE_HTTP_API } from './config';

const parse = (v: string) => v.split('.').map((n) => parseInt(n, 10) || 0);

/** True when `current` is older than `min` (plain semver major.minor.patch). */
export function isOlder(current: string, min: string): boolean {
  const a = parse(current);
  const b = parse(min);
  for (let i = 0; i < 3; i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) < (b[i] ?? 0);
  }
  return false;
}

/** `GET /system/min-frontend-version` (public). Resolves false when the API is not used or unreachable. */
export async function checkMinFrontendVersion(current: string | undefined): Promise<boolean> {
  if (!USE_HTTP_API || !current) return false;
  try {
    const res = await fetch(`${API_BASE}/system/min-frontend-version`);
    if (!res.ok) return false;
    const { minVersion } = (await res.json()) as { minVersion: string };
    return isOlder(current, minVersion);
  } catch {
    return false;
  }
}
