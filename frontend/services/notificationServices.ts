// services/notificationService.ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification behavior ONCE
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const requestNotificationPermissions = async (): Promise<boolean> => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    return finalStatus === 'granted';
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
};

export const setupNotificationChannel = async () => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('qoe-feedback', {
      name: 'QoE Feedback',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3b82f6',
      sound: 'default',
      enableVibrate: true,
    });
  }
};

export const scheduleQoENotification = async (
  reason: 'periodic' | 'signal',
  delayMinutes: number = 0
): Promise<string | null> => {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.log('Notification permission not granted');
      return null;
    }

    await setupNotificationChannel();

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
        sound: 'default',
      },
      trigger: delayMinutes > 0 ? {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, delayMinutes * 60), // Minimum 1 second
      } : null, // Show immediately if delayMinutes is 0
    });

    console.log('Notification scheduled:', notificationId);
    return notificationId;
  } catch (error) {
    console.error('Error scheduling QoE notification:', error);
    return null;
  }
};

export const cancelAllQoENotifications = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};