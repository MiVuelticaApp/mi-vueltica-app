import Constants from 'expo-constants';
import * as Device from 'expo-device';
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
    // Only with a permission already given: asking is the Ajustes pre-prompt's job (G11g), not a side effect of
    // signing in with saved events (review m1).
    if ((await Notifications.getPermissionsAsync()).status !== 'granted') return 0;
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

/** Expo push token for this device, or null where push cannot work (web, simulators, no EAS project id, no permission). */
export async function expoPushToken(): Promise<string | null> {
  if (Platform.OS === 'web' || !Device.isDevice) return null;
  const projectId = (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return null;
  try {
    if ((await Notifications.getPermissionsAsync()).status !== 'granted') return null;
    return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch {
    return null; // offline or not configured: tried again on the next launch / sign-in
  }
}

/** Registers the push token with the API for the signed-in user (#22). Safe to call often: the API upserts. */
export async function registerForPush(): Promise<boolean> {
  const token = await expoPushToken();
  if (!token) return false;
  try {
    await api.registerPushToken({ platform: Platform.OS === 'ios' ? 'ios' : 'android', pushToken: token });
    return true;
  } catch {
    return false;
  }
}

export { notificationTarget } from './notificationTarget';
