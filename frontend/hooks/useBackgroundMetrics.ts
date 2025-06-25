// hooks/useBackgroundMetrics.ts
import { useState, useEffect, useCallback } from "react";
import { AppState, AppStateStatus } from "react-native";
import {
  registerBackgroundTasks,
  unregisterBackgroundTasks,
  getBackgroundTaskStatus,
  getStoredMetrics,
  Metrics,
} from "../services/backgroundTaskServicemetrics"; // <-- FIXED IMPORT PATH

// A simpler, more direct status type
interface BackgroundStatus {
  fetchRegistered: boolean;
  locationRegistered: boolean;
  statusText: string;
  error?: string;
}

// Hook definition
export function useBackgroundMetrics() {
  const [backgroundStatus, setBackgroundStatus] = useState<BackgroundStatus>({
    fetchRegistered: false,
    locationRegistered: false,
    statusText: "Initializing...",
  });
  const [storedMetrics, setStoredMetrics] = useState<Metrics[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const checkStatus = useCallback(async () => {
    try {
      const status = await getBackgroundTaskStatus();
      setBackgroundStatus({
        fetchRegistered: status.backgroundFetch.registered,
        locationRegistered: status.backgroundLocation.registered,
        statusText: status.backgroundFetch.statusText,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "An unknown error occurred";
      setBackgroundStatus((prev) => ({
        ...prev,
        statusText: "Error",
        error: message,
      }));
    }
  }, []);

  const loadStoredMetrics = useCallback(async () => {
    try {
      const metrics = await getStoredMetrics();
      setStoredMetrics(metrics);
      console.log(`Loaded ${metrics.length} stored metrics`);
    } catch (error: unknown) {
      console.error("Failed to load stored metrics:", error);
    }
  }, []);

  const initialize = useCallback(async () => {
    setIsLoading(true);
    console.log("[useBackgroundMetrics] Calling registerBackgroundTasks...");
    try {
      await registerBackgroundTasks(); // This is where the core registration happens
      console.log(
        "[useBackgroundMetrics] registerBackgroundTasks finished. Checking final status..."
      );
      await checkStatus(); // Update the hook's internal status state
      await loadStoredMetrics();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "An unknown error occurred";
      console.error(
        "[useBackgroundMetrics] Failed to initialize background tasks:",
        error
      );
      setBackgroundStatus({
        fetchRegistered: false,
        locationRegistered: false,
        statusText: "Error during init",
        error: message,
      });
    } finally {
      setIsLoading(false);
      console.log("[useBackgroundMetrics] Initialization complete.");
    }
  }, [checkStatus, loadStoredMetrics]); // Dependencies are important

  const cleanup = useCallback(async () => {
    try {
      await unregisterBackgroundTasks();
      await checkStatus();
      console.log("Background tasks cleaned up");
    } catch (error: unknown) {
      console.error("Failed to cleanup background tasks:", error);
    }
  }, [checkStatus]);

  // Handle app state changes to refresh data
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === "active") {
        console.log("App is active, refreshing status and metrics...");
        checkStatus();
        loadStoredMetrics();
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );
    return () => {
      subscription.remove();
    };
  }, [checkStatus, loadStoredMetrics]);

  // Initialize on mount
  useEffect(() => {
    console.log("[useBackgroundMetrics] Hook mounted. Initializing tasks.");
    initialize();
  }, [initialize]);

  return {
    backgroundStatus,
    storedMetrics,
    isLoading,
    refresh: () => {
      checkStatus();
      loadStoredMetrics();
    },
    cleanup,
  };
}
