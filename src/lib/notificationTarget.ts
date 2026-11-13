/** Where a tapped notification leads: a plan (`vueltica` / `vuelticaId`), Mis vuelticas (`screen: 'mine'`) or an app path. */
export function notificationTarget(data: Record<string, unknown> | undefined | null): string | null {
  if (!data) return null;
  const id = data.vuelticaId ?? data.vueltica;
  if (typeof id === 'string' && /^[\w-]+$/.test(id)) return `/vueltica/${id}`;
  if (data.screen === 'mine') return '/mis-vuelticas';
  if (typeof data.url === 'string' && data.url.startsWith('/') && !data.url.startsWith('//')) return data.url;
  return null;
}

