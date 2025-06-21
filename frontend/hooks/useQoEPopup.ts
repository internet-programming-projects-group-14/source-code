import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { AppState, AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

interface QoEPopupConfig {
  periodicInterval: number; // in milliseconds (4 hours = 14400000)
  signalThreshold: number; // dBm threshold for poor signal
  minTimeBetweenPopups: number; // minimum time between popups
}

interface UseQoEPopupReturn {
  shouldShowPopup: boolean;
  popupTriggerReason: 'periodic' | 'signal' | null;
  dismissPopup: () => void;
  handleEmojiRating: (rating: number) => void;
}

const DEFAULT_CONFIG: QoEPopupConfig = {
  periodicInterval: 4 * 60 * 60 * 1000, // 4 hours
  signalThreshold: -85, // dBm - considered poor signal
  minTimeBetweenPopups: 30 * 60 * 1000, // 30 minutes minimum between popups
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

  // Check if enough time has passed since last popup
  const canShowPopup = async (): Promise<boolean> => {
    try {
      const lastPopupTime = await AsyncStorage.getItem(STORAGE_KEYS.LAST_POPUP_TIME);
      if (!lastPopupTime) return true;
      
      const timeSinceLastPopup = Date.now() - parseInt(lastPopupTime, 10);
      return timeSinceLastPopup >= fullConfig.minTimeBetweenPopups;
    } catch (error) {
      console.error('Error checking popup eligibility:', error);
      return true;
    }
  };

  // Record popup shown time
  const recordPopupShown = async (): Promise<void> => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_POPUP_TIME, Date.now().toString());
      
      // Increment popup count for analytics
      const currentCount = await AsyncStorage.getItem(STORAGE_KEYS.POPUP_COUNT);
      const newCount = currentCount ? parseInt(currentCount, 10) + 1 : 1;
      await AsyncStorage.setItem(STORAGE_KEYS.POPUP_COUNT, newCount.toString());
    } catch (error) {
      console.error('Error recording popup:', error);
    }
  };

  // Trigger popup with reason
  const triggerPopup = async (reason: 'periodic' | 'signal'): Promise<void> => {
    const canShow = await canShowPopup();
    if (canShow) {
      setPopupTriggerReason(reason);
      setShouldShowPopup(true);
      await recordPopupShown();
    }
  };

  // Check for poor signal strength
  const checkSignalStrength = async (): Promise<void> => {
    if (signalStrength !== null && signalStrength < fullConfig.signalThreshold) {
      console.log(`Poor signal detected: ${signalStrength} dBm`);
      await triggerPopup('signal');
    }
  };

  // Setup periodic timer
  const setupPeriodicTimer = (): void => {
    if (periodicTimerRef.current !== null) {
      clearInterval(periodicTimerRef.current);
      periodicTimerRef.current = null;
    }

    periodicTimerRef.current = setInterval(async () => {
      console.log('Periodic QoE check triggered');
      await triggerPopup('periodic');
    }, fullConfig.periodicInterval) as unknown as number;
  };

  // Setup signal monitoring
  const setupSignalMonitoring = (): void => {
    if (signalCheckTimerRef.current !== null) {
      clearInterval(signalCheckTimerRef.current);
      signalCheckTimerRef.current = null;
    }

    // Check signal every 30 seconds when app is active
    signalCheckTimerRef.current = setInterval(async () => {
      if (appState.current === 'active') {
        await checkSignalStrength();
      }
    }, 30000) as unknown as number;
  };

  // Handle app state changes
  const handleAppStateChange = (nextAppState: AppStateStatus): void => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      console.log('App has come to the foreground');
      // Check if we should show popup based on time elapsed
      checkPeriodicTrigger();
    }
    appState.current = nextAppState;
  };

  // Check if periodic popup should be triggered based on elapsed time
  const checkPeriodicTrigger = async (): Promise<void> => {
    try {
      const lastPopupTime = await AsyncStorage.getItem(STORAGE_KEYS.LAST_POPUP_TIME);
      if (!lastPopupTime) {
        await triggerPopup('periodic');
        return;
      }

      const timeSinceLastPopup = Date.now() - parseInt(lastPopupTime, 10);
      if (timeSinceLastPopup >= fullConfig.periodicInterval) {
        await triggerPopup('periodic');
      }
    } catch (error) {
      console.error('Error checking periodic trigger:', error);
    }
  };

  // Dismiss popup
  const dismissPopup = (): void => {
    setShouldShowPopup(false);
    setPopupTriggerReason(null);
  };

  // Handle emoji rating selection
  const handleEmojiRating = (rating: number): void => {
    if (popupTriggerReason) {
      onRatingSelected(rating, popupTriggerReason);
    }
    dismissPopup();
  };

  // Setup everything on mount
  useEffect(() => {
    // Setup app state listener
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Setup timers
    setupPeriodicTimer();
    setupSignalMonitoring();

    // Initial check when component mounts
    checkPeriodicTrigger();

    return () => {
      subscription?.remove();
      if (periodicTimerRef.current !== null) {
        clearInterval(periodicTimerRef.current);
        periodicTimerRef.current = null;
      }
      if (signalCheckTimerRef.current !== null) {
        clearInterval(signalCheckTimerRef.current);
        signalCheckTimerRef.current = null;
      }
    };
  }, []);

  // Monitor signal strength changes
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