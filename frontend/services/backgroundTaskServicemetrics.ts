// services/backgroundTaskServicemetrics.ts
import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as Device from "expo-device";
import { Platform, NativeModules } from "react-native";
import { measureThroughput } from "@/lib/calculateThroughput";
import { LocationData, DeviceInfo } from "@/lib/types";
import { getOrCreateUserId } from "@/lib/identityToken";

const { SignalModule } = NativeModules;

// Task names
const BACKGROUND_FETCH_TASK = "background-fetch-metrics";
const BACKGROUND_LOCATION_TASK = "background-location-metrics";

const METRICS_COLLECTION_INTERVAL = 60 * 60; //1 minute for testing

const STORAGE_KEY_PREFIX = "network_metrics_";
const MAX_STORED_METRICS = 100; // Keep last 100 readings

// Interfaces
export interface Metrics {
  timestamp: number;
  signalStrength?: number | null;
  networkType?: string | null;
  carrier?: string | null;
  frequency?: number | null;
  bandwidth?: number | null;
  cellId?: number | null;
  pci?: number | null;
  throughput?: string | null;
  latency?: number | null;
  location?: LocationData | null;
  device?: DeviceInfo;
  synced?: boolean;
  error?: string;
}

interface BackgroundTaskStatus {
  backgroundFetch: {
    registered: boolean;
    status: BackgroundFetch.BackgroundFetchStatus | null | string;
    statusText: string;
  };
  backgroundLocation: {
    registered: boolean;
  };
}

// Collect comprehensive network metrics
async function collectNetworkMetrics(): Promise<Metrics> {
  const timestamp = Date.now();
  const metrics: Metrics = { timestamp };

  // Get signal strength and cell info
  try {
    if (SignalModule?.getNetworkMetrics) {
      const signalData = await SignalModule.getNetworkMetrics();
      const cellInfo = signalData?.cellInfo?.[0] || {};
      metrics.signalStrength = cellInfo.signalStrength || null;
      metrics.networkType = cellInfo.type || null;
      metrics.carrier = signalData?.simCarrierName || null;
      metrics.frequency = cellInfo.earfcn || null;
      metrics.bandwidth = cellInfo.bandwidth || null;
      metrics.cellId = cellInfo.cellId || null;
      metrics.pci = cellInfo.pci || null;
    }
  } catch (e) {
    console.error("Error collecting signal metrics:", e);
  }

  // Get throughput
  try {
    const throughputData = await measureThroughput();
    metrics.throughput = throughputData.throughput || null;
  } catch (e) {
    console.error("Error measuring throughput:", e);
  }

  // Get location (if available)
  try {
    const lastLocation = await AsyncStorage.getItem("last_background_location");
    if (lastLocation) {
      const parsedLocation = JSON.parse(lastLocation);

      const locationData = {
        latitude: parsedLocation.location.latitude,
        longitude: parsedLocation.location.longitude,
      };

      const [address] = await Location.reverseGeocodeAsync(locationData);

      // Use location if it's less than 30 minutes old
      if (timestamp - parsedLocation.timestamp < 30 * 60 * 1000) {
        if (address) {
          metrics.location = {
            latitude: parsedLocation.location.latitude,
            longitude: parsedLocation.location.longitude,
            accuracy: parsedLocation.location.accuracy,
            city: address.city,
            subRegion: address.subregion,
            region: address.region,
          };
        } else {
          metrics.location = {
            latitude: parsedLocation.location.latitude,
            longitude: parsedLocation.location.longitude,
            accuracy: parsedLocation.location.accuracy,
          };
        }
      }
    }
  } catch (e) {
    console.error("Error retrieving stored location:", e);
  }

  // Measure latency
  try {
    const start = Date.now();
    await fetch("https://qoe-backend-ov95.onrender.com/ping-google");
    metrics.latency = Date.now() - start;
  } catch (e) {
    console.error("Latency measurement failed:", e);
  }

  // Add device info
  metrics.device = {
    platform: Platform.OS,
    model: Device.modelName,
    osVersion: Device.osVersion,
  };

  return metrics;
}

// Store metrics locally
async function storeMetrics(metrics: Metrics): Promise<void> {
  try {
    const existingMetrics = await getStoredMetrics();
    const newMetrics = [...existingMetrics, metrics].slice(-MAX_STORED_METRICS);
    await AsyncStorage.setItem(
      `${STORAGE_KEY_PREFIX}data`,
      JSON.stringify(newMetrics)
    );
    console.log(`Stored ${newMetrics.length} metrics entries`);
  } catch (error) {
    console.error("Error storing metrics:", error);
  }
}

// Get stored metrics
async function getStoredMetrics(): Promise<Metrics[]> {
  try {
    const stored = await AsyncStorage.getItem(`${STORAGE_KEY_PREFIX}data`);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error getting stored metrics:", error);
    return [];
  }
}

// Sync metrics to server

async function syncMetricsInBatches(
  unsyncedMetrics: Metrics[],
  allMetrics: Metrics[],
  userId: string,
  batchSize: number = 10
): Promise<void> {
  const batches = [];
  for (let i = 0; i < unsyncedMetrics.length; i += batchSize) {
    batches.push(unsyncedMetrics.slice(i, i + batchSize));
  }

  console.log(
    `[Background Sync] Syncing ${batches.length} batches of metrics...`
  );

  let syncedCount = 0;
  const syncedIds = new Set<number>();

  for (const [index, batch] of batches.entries()) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // Shorter timeout for batches

      const response = await fetch(
        "https://qoe.onrender.com/api/background/network-feedback",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "BackgroundTask/1.0",
          },
          body: JSON.stringify({
            userId: userId,
            metrics: batch,
            backgroundSync: true,
            batchInfo: { current: index + 1, total: batches.length },
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (response.ok) {
        batch.forEach((m) => syncedIds.add(m.timestamp));
        syncedCount += batch.length;
        console.log(
          `[Background Sync] Batch ${index + 1}/${
            batches.length
          } synced successfully`
        );
      } else {
        console.error(
          `[Background Sync] Batch ${index + 1} failed with status:`,
          response.status
        );
      }
    } catch (batchError) {
      console.error(
        `[Background Sync] Error syncing batch ${index + 1}:`,
        batchError
      );
    }
  }

  // Update synced status for successfully synced metrics
  if (syncedCount > 0) {
    const updatedMetrics = allMetrics.map((m) =>
      syncedIds.has(m.timestamp) ? { ...m, synced: true } : m
    );

    await AsyncStorage.setItem(
      `${STORAGE_KEY_PREFIX}data`,
      JSON.stringify(updatedMetrics)
    );

    console.log(
      `[Background Sync] Batch sync complete: ${syncedCount}/${unsyncedMetrics.length} metrics synced`
    );
  }
}

async function syncMetricsToServer(): Promise<void> {
  const userId = await getOrCreateUserId();

  try {
    const allMetrics = await getStoredMetrics();
    const unsyncedMetrics = allMetrics.filter((m) => !m.synced);

    if (unsyncedMetrics.length === 0) {
      console.log("[Background Sync] No unsynced metrics to send.");
      return;
    }

    console.log(
      `[Background Sync] Attempting to sync ${unsyncedMetrics.length} metrics...`
    );

    // Add timeout for background requests (background tasks have limited execution time)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 seconds timeout

    try {
      const response = await fetch(
        "https://qoe.onrender.com/api/background/network-feedback",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "BackgroundTask/1.0", // Identify background requests
          },
          body: JSON.stringify({
            userId: userId,
            metrics: unsyncedMetrics,
            backgroundSync: true, // Flag to indicate this is a background sync
            timestamp: Date.now(),
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (response.ok) {
        // Mark metrics as synced
        const syncedIds = new Set(unsyncedMetrics.map((m) => m.timestamp));
        const updatedMetrics = allMetrics.map((m) =>
          syncedIds.has(m.timestamp) ? { ...m, synced: true } : m
        );

        await AsyncStorage.setItem(
          `${STORAGE_KEY_PREFIX}data`,
          JSON.stringify(updatedMetrics)
        );

        console.log(
          `[Background Sync] Successfully synced ${unsyncedMetrics.length} metrics to server`
        );

        // Store last successful sync timestamp
        await AsyncStorage.setItem(
          `${STORAGE_KEY_PREFIX}last_sync`,
          JSON.stringify({
            timestamp: Date.now(),
            count: unsyncedMetrics.length,
          })
        );
      } else {
        console.error(
          "[Background Sync] Failed to sync metrics, server responded with:",
          response.status
        );

        // Log response for debugging but don't throw to avoid breaking background task
        try {
          const errorBody = await response.text();
          console.error("[Background Sync] Server error response:", errorBody);
        } catch (e) {
          console.error("[Background Sync] Could not read error response:", e);
        }

        // For certain status codes, you might want to implement retry logic
        if (response.status >= 500) {
          console.log(
            "[Background Sync] Server error, will retry on next background task"
          );
        } else if (response.status === 413) {
          // Payload too large - try to sync in smaller batches
          console.log(
            "[Background Sync] Payload too large, implementing batch sync..."
          );
          await syncMetricsInBatches(unsyncedMetrics, allMetrics, userId);
        }
      }
    } catch (fetchError: any) {
      clearTimeout(timeoutId);

      if (fetchError.name === "AbortError") {
        console.error("[Background Sync] Request timed out");
      } else {
        console.error(
          "[Background Sync] Network error during sync:",
          fetchError
        );
      }

      // Don't throw - let background task continue
    }
  } catch (error) {
    console.error("[Background Sync] Error syncing metrics:", error);
    // Don't throw - we want background task to continue running
  }
}

// Function to get last sync info (useful for debugging)
export async function getLastSyncInfo(): Promise<{
  timestamp: number;
  count: number;
} | null> {
  try {
    const stored = await AsyncStorage.getItem(`${STORAGE_KEY_PREFIX}last_sync`);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error("Error getting last sync info:", error);
    return null;
  }
}

export async function registerBackgroundTasks(): Promise<boolean> {
  console.log("Attempting to register background tasks...");
  try {
    // --- Location Background Task Registration ---
    console.log("Requesting background location permissions...");
    const { status: locationPermissionStatus } =
      await Location.requestBackgroundPermissionsAsync();
    console.log(
      `Background location permission status: ${locationPermissionStatus}`
    );

    if (locationPermissionStatus === "granted") {
      const hasStartedLocationUpdates =
        await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      if (hasStartedLocationUpdates) {
        console.log(
          "Background location updates already started. Not restarting."
        );
      } else {
        console.log("Starting background location updates...");
        await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 15 * 60 * 1000, // 5 minutes
          distanceInterval: 500, // 500 meters
          showsBackgroundLocationIndicator: true, // Set to true for easier debugging
        });
        console.log("Background location registered successfully.");
      }
    } else {
      console.warn(
        "Background location permission not granted, skipping location task registration."
      );
    }

    // --- Background Fetch Task Registration ---
    console.log("Checking BackgroundFetch status...");
    const fetchStatus = await BackgroundFetch.getStatusAsync();
    console.log(
      `BackgroundFetch current status: ${getBackgroundFetchStatusText(
        fetchStatus
      )} (${fetchStatus})`
    );

    // Check if the task is already registered
    const isFetchTaskRegistered = await TaskManager.isTaskRegisteredAsync(
      BACKGROUND_FETCH_TASK
    );
    if (isFetchTaskRegistered) {
      console.log(
        `Background fetch task '${BACKGROUND_FETCH_TASK}' is already registered. Not re-registering.`
      );
    } else if (
      fetchStatus === BackgroundFetch.BackgroundFetchStatus.Available
    ) {
      console.log(
        `BackgroundFetch available, registering task '${BACKGROUND_FETCH_TASK}'...`
      );
      await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
        minimumInterval: METRICS_COLLECTION_INTERVAL,
        stopOnTerminate: false,
        startOnBoot: true,
      });
      console.log(
        `Background fetch task '${BACKGROUND_FETCH_TASK}' registered successfully.`
      );
    } else {
      console.warn(
        `BackgroundFetch not available or denied (${getBackgroundFetchStatusText(
          fetchStatus
        )}), skipping background fetch task registration.`
      );
      // Consider explicitly returning false or throwing if critical
    }

    // Final check
    const finalIsFetchRegistered = await TaskManager.isTaskRegisteredAsync(
      BACKGROUND_FETCH_TASK
    );
    const finalIsLocationRegistered = await TaskManager.isTaskRegisteredAsync(
      BACKGROUND_LOCATION_TASK
    );
    console.log(
      `Final registration status: Fetch=${finalIsFetchRegistered}, Location=${finalIsLocationRegistered}`
    );

    return finalIsFetchRegistered || finalIsLocationRegistered; // Return true if at least one is registered
  } catch (error: any) {
    console.error("CRITICAL ERROR during background task registration:", error);
    // You can re-throw or handle more gracefully
    return false;
  }
}

// Unregister background tasks
export async function unregisterBackgroundTasks(): Promise<void> {
  try {
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
    if (
      await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)
    ) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }
    console.log("Background tasks unregistered");
  } catch (error) {
    console.error("Error unregistering background tasks:", error);
  }
}

// Get background task status
export async function getBackgroundTaskStatus(): Promise<BackgroundTaskStatus> {
  try {
    const isFetchRegistered = await TaskManager.isTaskRegisteredAsync(
      BACKGROUND_FETCH_TASK
    );
    const fetchStatus = await BackgroundFetch.getStatusAsync();
    const isLocationRegistered = await TaskManager.isTaskRegisteredAsync(
      BACKGROUND_LOCATION_TASK
    );

    return {
      backgroundFetch: {
        registered: isFetchRegistered,
        status: fetchStatus,
        statusText: getBackgroundFetchStatusText(fetchStatus),
      },
      backgroundLocation: {
        registered: isLocationRegistered,
      },
    };
  } catch (error) {
    console.error("Error getting background task status:", error);
    return {
      backgroundFetch: {
        registered: false,
        status: "error",
        statusText: "Error",
      },
      backgroundLocation: { registered: false },
    };
  }
}

// Helper function to get status text
function getBackgroundFetchStatusText(
  status: BackgroundFetch.BackgroundFetchStatus | null
): string {
  if (status === null) return "Unknown";
  switch (status) {
    case BackgroundFetch.BackgroundFetchStatus.Available:
      return "Available";
    case BackgroundFetch.BackgroundFetchStatus.Denied:
      return "Denied";
    case BackgroundFetch.BackgroundFetchStatus.Restricted:
      return "Restricted";
    default:
      return "Unknown";
  }
}

// Export utility functions
export {
  getStoredMetrics,
  storeMetrics,
  collectNetworkMetrics,
  syncMetricsToServer,
  BACKGROUND_FETCH_TASK,
  BACKGROUND_LOCATION_TASK,
};
