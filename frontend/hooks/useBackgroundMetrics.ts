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
    statusText: "Not Registered",
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

  const startBackgroundTasks = useCallback(async () => {
    console.log(
      "[useBackgroundMetrics] Manually triggering background task registration..."
    );
    setIsLoading(true);
    try {
      const success = await registerBackgroundTasks(); // This is the core call
      console.log(
        `[useBackgroundMetrics] registerBackgroundTasks returned: ${success}`
      );
      await checkStatus(); // Refresh status after registration attempt
      await loadStoredMetrics(); // Refresh metrics
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "An unknown error occurred during startBackgroundTasks";
      console.error(
        "[useBackgroundMetrics] Error starting background tasks:",
        error
      );
      setBackgroundStatus((prev) => ({
        ...prev,
        statusText: "Error",
        error: message,
      }));
    } finally {
      setIsLoading(false);
      console.log(
        "[useBackgroundMetrics] startBackgroundTasks process complete."
      );
    }
  }, [checkStatus, loadStoredMetrics]);

  const cleanup = useCallback(async () => {
    try {
      await unregisterBackgroundTasks();
      await checkStatus();
      console.log("Background tasks cleaned up");
    } catch (error: unknown) {
      console.error("Failed to cleanup background tasks:", error);
    }
  }, [checkStatus]);

  // Initial load and status check (without attempting to register)
  useEffect(() => {
    console.log(
      "[useBackgroundMetrics] Hook mounted. Performing initial status check and loading metrics."
    );
    setIsLoading(true);
    const initialLoad = async () => {
      await checkStatus();
      await loadStoredMetrics();
      setIsLoading(false);
    };
    initialLoad();
  }, [checkStatus, loadStoredMetrics]); // Dependencies for initial effect

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === "active") {
        console.log(
          "[useBackgroundMetrics] App is active, refreshing status and metrics..."
        );
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

  return {
    backgroundStatus,
    storedMetrics,
    startBackgroundTasks,
    loadStoredMetrics,
    checkStatus,
    isLoading,
    refresh: () => {
      checkStatus();
      loadStoredMetrics();
    },
    cleanup,
  };
}
