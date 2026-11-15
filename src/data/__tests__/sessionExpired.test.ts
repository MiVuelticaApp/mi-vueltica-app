import { toast } from '@/components/ui/Toast';
import { t } from '@/i18n/es-CR';
import { useSession } from '@/state/session';
import type { User } from '@/domain/types';
import { handleSessionExpired } from '../sessionExpired';

jest.mock('@/state/storage', () => ({ persistStorage: undefined }));
jest.mock('@/components/ui/Toast', () => ({ toast: jest.fn() }));

const USER = { id: 'u1', displayName: 'Ana', provider: 'google' } as User;

beforeEach(() => {
  (toast as jest.Mock).mockClear();
});

describe('handleSessionExpired', () => {
  it('signs out and toasts once for a burst of 401s', () => {
    useSession.getState().setUser(USER);
    const clear = jest.fn(async () => {});
    handleSessionExpired(clear);
    handleSessionExpired(clear);
    handleSessionExpired(clear);
    expect(useSession.getState().user).toBeNull();
    expect(clear).toHaveBeenCalledTimes(3);
    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith(t.auth.sessionExpired);
  });
  it('toasts again after a new sign-in expires', () => {
    useSession.getState().setUser(USER);
    handleSessionExpired(async () => {});
    useSession.getState().setUser(USER);
    handleSessionExpired(async () => {});
    expect(toast).toHaveBeenCalledTimes(2);
  });
  it('does not toast for a guest', () => {
    useSession.getState().setUser(null);
    handleSessionExpired(async () => {});
    expect(toast).not.toHaveBeenCalled();
  });
});
