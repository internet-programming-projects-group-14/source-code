import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Task names
export const BACKGROUND_NOTIFICATION_TASK = 'background-notification-task';
export const SIGNAL_MONITORING_TASK = 'signal-monitoring-task';

// Configuration
const TASK_CONFIG = {
  periodicInterval: 1 * 60, // 1 minute in seconds
  minTimeBetweenPopups: 30 * 1000, // 30 seconds in milliseconds
  signalThreshold: -85,
};

// Helper function to check if notification should be shown
const shouldShowNotification = async (): Promise<boolean> => {
  try {
    const lastPopupTime = await AsyncStorage.getItem("qoe_last_popup_time");
    if (!lastPopupTime) return true;

    const timeSinceLastPopup = Date.now() - parseInt(lastPopupTime, 10);
    return timeSinceLastPopup >= TASK_CONFIG.minTimeBetweenPopups;
  } catch (error) {
    console.error("Error checking notification eligibility:", error);
    return true;
  }
};

// Helper function to record notification shown
const recordNotificationShown = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem("qoe_last_popup_time", Date.now().toString());
    
    const currentCount = await AsyncStorage.getItem("qoe_popup_count");
    const newCount = currentCount ? parseInt(currentCount, 10) + 1 : 1;
    await AsyncStorage.setItem("qoe_popup_count", newCount.toString());
  } catch (error) {
    console.error("Error recording notification:", error);
  }
};

// Helper function to schedule notification
const scheduleBackgroundNotification = async (reason: 'periodic' | 'signal'): Promise<void> => {
  try {
    const title = reason === 'signal' 
      ? '📶 Poor Network Detected' 
      : '📶 Rate Your Network Quality';
    
    const body = reason === 'signal'
      ? 'How is your network experience right now?'
      : 'Help us improve by rating your recent connection quality';

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { type: 'qoe-feedback', reason },
        sound: 'default',
      },
      trigger: null, // Show immediately
    });

    await recordNotificationShown();
    console.log(`Background notification scheduled for reason: ${reason}`);
  } catch (error) {
    console.error('Error scheduling background notification:', error);
  }
};

// Define the periodic notification task
TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async () => {
  try {
    console.log('Background notification task running');
    
    const canShow = await shouldShowNotification();
    if (canShow) {
      await scheduleBackgroundNotification('periodic');
      return BackgroundFetch.BackgroundFetchResult.NewData;
    }
    
    console.log('Background task: Too soon for notification');
    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    console.error('Background notification task error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Define the signal monitoring task
TaskManager.defineTask(SIGNAL_MONITORING_TASK, async () => {
  try {
    console.log('Background signal monitoring task running');
    
    const storedSignalData = await AsyncStorage.getItem('last_signal_strength');
    if (storedSignalData) {
      const signalStrength = parseInt(storedSignalData, 10);
      
      if (signalStrength < TASK_CONFIG.signalThreshold) {
        const canShow = await shouldShowNotification();
        if (canShow) {
          await scheduleBackgroundNotification('signal');
          return BackgroundFetch.BackgroundFetchResult.NewData;
        }
      }
    }
    
    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    console.error('Background signal monitoring task error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Register background tasks
export const registerBackgroundTasks = async (): Promise<void> => {
  try {
    // Check if tasks are already registered
    const isNotificationTaskRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_NOTIFICATION_TASK);
    const isSignalTaskRegistered = await TaskManager.isTaskRegisteredAsync(SIGNAL_MONITORING_TASK);

    // Register notification task
    if (!isNotificationTaskRegistered) {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK, {
        minimumInterval: TASK_CONFIG.periodicInterval,
        stopOnTerminate: false,
        startOnBoot: true,
      });
      console.log('Background notification task registered');
    }

    // Register signal monitoring task
    if (!isSignalTaskRegistered) {
      await BackgroundFetch.registerTaskAsync(SIGNAL_MONITORING_TASK, {
        minimumInterval: 30, // Check every 30 seconds
        stopOnTerminate: false,
        startOnBoot: true,
      });
      console.log('Background signal monitoring task registered');
    }

    // Set background fetch interval
    await BackgroundFetch.setMinimumIntervalAsync(TASK_CONFIG.periodicInterval);
    
  } catch (error) {
    console.error('Failed to register background tasks:', error);
  }
};

// Unregister background tasks
export const unregisterBackgroundTasks = async (): Promise<void> => {
  try {
    await TaskManager.unregisterTaskAsync(BACKGROUND_NOTIFICATION_TASK);
    await TaskManager.unregisterTaskAsync(SIGNAL_MONITORING_TASK);
    console.log('Background tasks unregistered');
  } catch (error) {
    console.error('Failed to unregister background tasks:', error);
  }
};

// Store signal strength for background monitoring
export const storeSignalStrength = async (signalStrength: number | null): Promise<void> => {
  try {
    if (signalStrength !== null) {
      await AsyncStorage.setItem('last_signal_strength', signalStrength.toString());
    }
  } catch (error) {
    console.error('Error storing signal strength:', error);
  }
};

// Get background task status
export const getBackgroundTaskStatus = async (): Promise<{
  notificationTask: BackgroundFetch.BackgroundFetchStatus;
  signalTask: BackgroundFetch.BackgroundFetchStatus;
}> => {
  try {
    const notificationTaskStatus = await BackgroundFetch.getStatusAsync() ?? BackgroundFetch.BackgroundFetchStatus.Restricted;
    const signalTaskStatus = await BackgroundFetch.getStatusAsync() ?? BackgroundFetch.BackgroundFetchStatus.Restricted;
    
    return {
      notificationTask: notificationTaskStatus,
      signalTask: signalTaskStatus,
    };
  } catch (error) {
    console.error('Error getting background task status:', error);
    return {
      notificationTask: BackgroundFetch.BackgroundFetchStatus.Denied,
      signalTask: BackgroundFetch.BackgroundFetchStatus.Denied,
    };
  }
};