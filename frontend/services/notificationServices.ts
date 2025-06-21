// services/notificationService.ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: false,
  }),
});

export const setupNotificationHandler = () => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: false
    }),
  });
};

export const requestNotificationPermissions = async (): Promise<boolean> => {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
};

export const scheduleQoENotification = async (
  reason: 'periodic' | 'signal',
  delayMinutes: number = 0
): Promise<string | null> => {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('qoe-feedback', {
        name: 'QoE Feedback',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3b82f6',
      });
    }

    const title = reason === 'signal'
      ? '📶 Poor Network Detected'
      : '📶 Rate Your Network Quality';

    const body = reason === 'signal'
      ? 'How is your network experience right now?'
      : 'Help us improve by rating your recent connection quality';

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { type: 'qoe-feedback', reason },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: delayMinutes * 60,
      },
    });

    return notificationId;
  } catch (error) {
    console.error('Error scheduling QoE notification:', error);
    return null;
  }
};

export const cancelAllQoENotifications = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};