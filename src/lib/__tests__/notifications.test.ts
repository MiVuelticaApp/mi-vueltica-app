import { notificationTarget } from '../notificationTarget';

describe('notification taps (#22)', () => {
  it('opens the plan, Mis vuelticas or an app path, and ignores anything else', () => {
    expect(notificationTarget({ vuelticaId: 'p-123e4567' })).toBe('/vueltica/p-123e4567');
    expect(notificationTarget({ vueltica: 's-abc' })).toBe('/vueltica/s-abc');
    expect(notificationTarget({ screen: 'mine' })).toBe('/mis-vuelticas');
    expect(notificationTarget({ url: '/guardados' })).toBe('/guardados');
    expect(notificationTarget({ url: 'https://evil.example' })).toBeNull();
    expect(notificationTarget({ url: '//evil.example' })).toBeNull();
    expect(notificationTarget({ vuelticaId: '../../x' })).toBeNull();
    expect(notificationTarget(undefined)).toBeNull();
  });
});
