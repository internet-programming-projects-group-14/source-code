// hooks/useQoEPopup.ts
import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';
import { setupNotificationChannel, scheduleQoENotification,
  cancelAllQoENotifications,
  requestNotificationPermissions } from '@/services/notificationServices';

interface QoEPopupConfig {
  periodicInterval: number;
  signalThreshold: number;
  minTimeBetweenPopups: number;
  notificationDelayMinutes?: number;
}

interface UseQoEPopupReturn {
  shouldShowPopup: boolean;
  popupTriggerReason: 'periodic' | 'signal' | null;
  dismissPopup: () => void;
  handleEmojiRating: (rating: number) => void;
}

const DEFAULT_CONFIG: QoEPopupConfig = {
  periodicInterval: 4 * 60 * 60 * 1000, // 4 hours
  signalThreshold: -85, // dBm
  minTimeBetweenPopups: 30 * 60 * 1000, // 30 minutes
  notificationDelayMinutes: 5, // Show notification 5 minutes after trigger
};

const STORAGE_KEYS = {
  LAST_POPUP_TIME: 'qoe_last_popup_time',
  LAST_SIGNAL_CHECK: 'qoe_last_signal_check',
  POPUP_COUNT: 'qoe_popup_count',
};

export const useQoEPopup = (
  signalStrength: number | null,
  onRatingSelected: (rating: number, reason: 'periodic' | 'signal') => void,
  config: Partial<QoEPopupConfig> = {}
): UseQoEPopupReturn => {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const [shouldShowPopup, setShouldShowPopup] = useState(false);
  const [popupTriggerReason, setPopupTriggerReason] = useState<'periodic' | 'signal' | null>(null);
  
  const appState = useRef(AppState.currentState);
  const periodicTimerRef = useRef<number | null>(null);
  const signalCheckTimerRef = useRef<number | null>(null);

  // Initialize notification handler
  useEffect(() => {
    setupNotificationChannel();
    requestNotificationPermissions();
    
    return () => {
      cancelAllQoENotifications();
    };
  }, []);

  const canShowPopup = async (): Promise<boolean> => {
    try {
      const lastPopupTime = await AsyncStorage.getItem(STORAGE_KEYS.LAST_POPUP_TIME);
      if (!lastPopupTime) return true;
      
      return Date.now() - parseInt(lastPopupTime, 10) >= fullConfig.minTimeBetweenPopups;
    } catch (error) {
      console.error('Error checking popup eligibility:', error);
      return true;
    }
  };

  const recordPopupShown = async (): Promise<void> => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_POPUP_TIME, Date.now().toString());
      const currentCount = await AsyncStorage.getItem(STORAGE_KEYS.POPUP_COUNT);
      const newCount = currentCount ? parseInt(currentCount, 10) + 1 : 1;
      await AsyncStorage.setItem(STORAGE_KEYS.POPUP_COUNT, newCount.toString());
    } catch (error) {
      console.error('Error recording popup:', error);
    }
  };

  const triggerPopup = async (reason: 'periodic' | 'signal'): Promise<void> => {
    const canShow = await canShowPopup();
    if (!canShow) return;

    await recordPopupShown();
    
    if (appState.current === 'active') {
      setPopupTriggerReason(reason);
      setShouldShowPopup(true);
    } else {
      await scheduleQoENotification(reason, fullConfig.notificationDelayMinutes);
    }
  };

  const checkSignalStrength = async (): Promise<void> => {
    if (signalStrength !== null && signalStrength < fullConfig.signalThreshold) {
      console.log(`Poor signal detected: ${signalStrength} dBm`);
      await triggerPopup('signal');
    }
  };

  const setupPeriodicTimer = (): void => {
    if (periodicTimerRef.current !== null) {
      clearInterval(periodicTimerRef.current);
    }

    periodicTimerRef.current = setInterval(async () => {
      console.log('Periodic QoE check triggered');
      await triggerPopup('periodic');
    }, fullConfig.periodicInterval) as unknown as number;
  };

  const setupSignalMonitoring = (): void => {
    if (signalCheckTimerRef.current !== null) {
      clearInterval(signalCheckTimerRef.current);
    }

    signalCheckTimerRef.current = setInterval(async () => {
      if (appState.current === 'active') {
        await checkSignalStrength();
      }
    }, 30000) as unknown as number;
  };

  const handleAppStateChange = (nextAppState: AppStateStatus): void => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      console.log('App came to foreground');
      checkPeriodicTrigger();
    }
    appState.current = nextAppState;
  };

  const checkPeriodicTrigger = async (): Promise<void> => {
    try {
      const lastPopupTime = await AsyncStorage.getItem(STORAGE_KEYS.LAST_POPUP_TIME);
      if (!lastPopupTime) {
        await triggerPopup('periodic');
        return;
      }
      if (Date.now() - parseInt(lastPopupTime, 10) >= fullConfig.periodicInterval) {
        await triggerPopup('periodic');
      }
    } catch (error) {
      console.error('Error checking periodic trigger:', error);
    }
  };

  const dismissPopup = (): void => {
    setShouldShowPopup(false);
    setPopupTriggerReason(null);
  };

  const handleEmojiRating = (rating: number): void => {
    if (popupTriggerReason) {
      onRatingSelected(rating, popupTriggerReason);
    }
    dismissPopup();
  };

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    setupPeriodicTimer();
    setupSignalMonitoring();
    checkPeriodicTrigger();

    return () => {
      subscription.remove();
      if (periodicTimerRef.current !== null) {
        clearInterval(periodicTimerRef.current);
      }
      if (signalCheckTimerRef.current !== null) {
        clearInterval(signalCheckTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (signalStrength !== null) {
      checkSignalStrength();
    }
  }, [signalStrength]);

  return {
    shouldShowPopup,
    popupTriggerReason,
    dismissPopup,
    handleEmojiRating,
  };
};