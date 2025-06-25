// hooks/useBackgroundMetrics.ts
import { useState, useEffect, useCallback } from "react";
import { AppState, AppStateStatus } from "react-native";
import {
  registerBackgroundTasks,
  unregisterBackgroundTasks,
  getBackgroundTaskStatus,
  getStoredMetrics,
  Metrics,
} from "../services/backgroundTaskServicemetrics";
import { BackgroundFetchStatus } from "expo-background-fetch";

// Define types for background status
interface BackgroundStatus {
  registered: boolean;
  status: string | BackgroundFetchStatus;
  details?: {
    backgroundFetch: {
      registered: boolean;
      status: string | BackgroundFetchStatus;
      statusText: string;
    };
    backgroundLocation: {
      registered: boolean;
    };
  };
  error?: string;
}

// Hook definition
export function useBackgroundMetrics() {
  // State variables
  const [backgroundStatus, setBackgroundStatus] = useState<BackgroundStatus>({
    registered: false,
    status: "unknown",
  });
  const [storedMetrics, setStoredMetrics] = useState<Metrics[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize background tasks
  const initializeBackgroundTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log("Initializing network background tasks...");

      const success = await registerBackgroundTasks();
      const status = await getBackgroundTaskStatus();
      setBackgroundStatus({
        registered: success,
        status: String(status.backgroundFetch.statusText ?? "Unknown"), // Handle null case
        details: {
          ...status,
          backgroundFetch: {
            ...status.backgroundFetch,
            status: status.backgroundFetch.status ?? "Unknown", // Handle null case
          },
        },
      });

      console.log("Network metrics background tasks initialized:", {
        success,
        status,
      });
    } catch (error: any) {
      console.error("Failed to initialize background tasks:", error);
      setBackgroundStatus({
        registered: false,
        status: "error",
        error: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load stored metrics
  const loadStoredMetrics = useCallback(async () => {
    try {
      const metrics = await getStoredMetrics();
      setStoredMetrics(metrics);
      console.log(`Loaded ${metrics.length} stored metrics`);
    } catch (error: any) {
      console.error("Failed to load stored metrics:", error);
    }
  }, []);

  // Cleanup background tasks
  const cleanup = useCallback(async () => {
    try {
      await unregisterBackgroundTasks();
      console.log("Background tasks cleaned up");
    } catch (error: any) {
      console.error("Failed to cleanup background tasks:", error);
    }
  }, []);

  // Check background task status
  const checkStatus = useCallback(async () => {
    try {
      const status = await getBackgroundTaskStatus();
      setBackgroundStatus((prev) => ({
        ...prev,
        status: status.backgroundFetch.statusText ?? "Unknown", // Handle null case
        details: {
          ...status,
          backgroundFetch: {
            ...status.backgroundFetch,
            status: status.backgroundFetch.status ?? "Unknown", // Handle null case
          },
        },
      }));
      return status;
    } catch (error: any) {
      console.error("Failed to check background status:", error);
      return null;
    }
  }, []);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log("App state changed to:", nextAppState);
      if (nextAppState === "active") {
        // Refresh data when app becomes active
        loadStoredMetrics();
        checkStatus();
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );
    return () => subscription?.remove();
  }, [loadStoredMetrics, checkStatus]);

  // Initialize on mount
  useEffect(() => {
    initializeBackgroundTasks();
    loadStoredMetrics();
  }, [initializeBackgroundTasks, loadStoredMetrics]);

  // Return hook values
  return {
    backgroundStatus,
    storedMetrics,
    isLoading,
    initializeBackgroundTasks,
    loadStoredMetrics,
    cleanup,
    checkStatus,
  };
}
