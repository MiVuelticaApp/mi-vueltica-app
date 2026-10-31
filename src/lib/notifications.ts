import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from '@/data';
import { t } from '@/i18n/es-CR';
import { useSettings } from '@/state/settings';

let handlerSet = false;

export function setupNotificationHandler() {
  if (handlerSet || Platform.OS === 'web') return;
  handlerSet = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    if (Platform.OS === 'android') {
      // eslint-disable-next-line import/namespace
      await Notifications.setNotificationChannelAsync('default', { name: 'MiVueltica', importance: Notifications.AndroidImportance.DEFAULT });
    }
    const cur = await Notifications.getPermissionsAsync();
    if (cur.status === 'granted') return true;
    const res = await Notifications.requestPermissionsAsync();
    return res.status === 'granted';
  } catch {
    return false;
  }
}

/** Re-create the local reminders (saved events, 1 day before at 9:00 a.m.). */
export async function syncReminders(): Promise<number> {
  if (Platform.OS === 'web') return 0;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!useSettings.getState().settings.notifyReminders) return 0;
    const reminders = await api.scheduleNotifications();
    if (reminders.length === 0) return 0;
    if (!(await ensureNotificationPermission())) return 0;
    for (const r of reminders) {
      await Notifications.scheduleNotificationAsync({
        content: { title: t.app.name, body: r.body, data: { vuelticaId: r.vuelticaId } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(r.fireAt), ...(Platform.OS === 'android' ? { channelId: 'default' } : null) },
      });
    }
    return reminders.length;
  } catch {
    return 0;
  }
}
