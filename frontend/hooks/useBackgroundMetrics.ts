// hooks/useBackgroundMetrics.js
import { useState, useEffect, useCallback } from "react";
import { AppState } from "react-native";
import {
  registerBackgroundTasks,
  unregisterBackgroundTasks,
  getBackgroundTaskStatus,
  getStoredMetrics,
  collectNetworkMetrics,
  storeMetrics,
} from "../services/backgroundTaskServicemetrics";

export function useBackgroundMetrics() {
  const [backgroundStatus, setBackgroundStatus] = useState({
    registered: false,
    status: "unknown",
  });
  const [storedMetrics, setStoredMetrics] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize background tasks
  const initializeBackgroundTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log("Initializing background tasks...");

      const success = await registerBackgroundTasks();
      const status = await getBackgroundTaskStatus();

      setBackgroundStatus({
        registered: success,
        status: status.backgroundFetch.statusText,
        details: status,
      });

      console.log("Background tasks initialized:", { success, status });
    } catch (error) {
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
    } catch (error) {
      console.error("Failed to load stored metrics:", error);
    }
  }, []);

  // Manually collect metrics (for immediate collection)
  const collectMetricsNow = useCallback(async () => {
    try {
      console.log("Collecting metrics manually...");
      const metrics = await collectNetworkMetrics();
      await storeMetrics(metrics);
      await loadStoredMetrics(); // Refresh the stored metrics
      return metrics;
    } catch (error) {
      console.error("Failed to collect metrics:", error);
      throw error;
    }
  }, [loadStoredMetrics]);

  // Cleanup background tasks
  const cleanup = useCallback(async () => {
    try {
      await unregisterBackgroundTasks();
      console.log("Background tasks cleaned up");
    } catch (error) {
      console.error("Failed to cleanup background tasks:", error);
    }
  }, []);

  // Check background task status
  const checkStatus = useCallback(async () => {
    try {
      const status = await getBackgroundTaskStatus();
      setBackgroundStatus((prev) => ({
        ...prev,
        status: status.backgroundFetch.statusText,
        details: status,
      }));
      return status;
    } catch (error) {
      console.error("Failed to check background status:", error);
      return null;
    }
  }, []);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
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

  return {
    backgroundStatus,
    storedMetrics,
    isLoading,
    initializeBackgroundTasks,
    loadStoredMetrics,
    collectMetricsNow,
    cleanup,
    checkStatus,
  };
}
