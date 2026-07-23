import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { registerPushToken } from './api';

// הצגת התראה גם כשהאפליקציה בפורגראונד
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('leads', {
    name: 'לידים חדשים',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#A8325A',
  });
}

/**
 * מבקש הרשאה, מקבל Expo push token ורושם אותו בשרת ללקוח המחובר.
 * לא עובד ב-Expo Go (iOS) — רק ב-dev build / TestFlight / App Store.
 */
export async function registerForPush(): Promise<void> {
  try {
    if (!Device.isDevice) return; // סימולטור לא מקבל push
    await ensureAndroidChannel();

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') return;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId;
    if (!projectId) return;

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    if (token) await registerPushToken(token, Platform.OS);
  } catch {
    /* שקט — נכשל בהרשאה/רשת/Expo Go */
  }
}
