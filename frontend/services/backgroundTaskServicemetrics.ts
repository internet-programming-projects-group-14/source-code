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

const METRICS_COLLECTION_INTERVAL = 1 * 60; // 15 minutes (more realistic)

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
      // Use location if it's less than 30 minutes old
      if (timestamp - parsedLocation.timestamp < 30 * 60 * 1000) {
        metrics.location = {
          latitude: parsedLocation.location.latitude,
          longitude: parsedLocation.location.longitude,
          accuracy: parsedLocation.location.accuracy,
        };
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

async function syncMetricsToServer(): Promise<void> {
  // Retrieve the userId at the beginning
  const userId = await getOrCreateUserId();
  console.log("[SyncMetrics] User ID is:", userId); // This log might be redundant here if it's already in onboarding

  try {
    const allMetrics = await getStoredMetrics();
    const unsyncedMetrics = allMetrics.filter((m) => !m.synced);

    if (unsyncedMetrics.length === 0) {
      console.log("No unsynced metrics to send.");
      return;
    }

    console.log(
      JSON.stringify({
        userId: userId,
        metrics: unsyncedMetrics,
      })
    );

    const response = await fetch(
      "https://qoe.onrender.com/api/background/network-feedback",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userId,
          metrics: unsyncedMetrics,
        }),
      }
    );

    if (response.ok) {
      const syncedIds = new Set(unsyncedMetrics.map((m) => m.timestamp));
      const updatedMetrics = allMetrics.map((m) =>
        syncedIds.has(m.timestamp) ? { ...m, synced: true } : m
      );
      await AsyncStorage.setItem(
        `${STORAGE_KEY_PREFIX}data`,
        JSON.stringify(updatedMetrics)
      );
      console.log(`Synced ${unsyncedMetrics.length} metrics to server`);
    } else {
      console.error(
        "Failed to sync metrics, server responded with:",
        response.status
      );
      // Optional: Log response body for more details if server sends error messages
      const errorBody = await response.text();
      console.error("Server error response:", errorBody);
    }
  } catch (error) {
    console.error("Error syncing metrics:", error);
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
          timeInterval: 5 * 60 * 1000, // 5 minutes
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
// Register background tasks
// export async function registerBackgroundTasks(): Promise<boolean> {
//   try {
//     const { status: locationPermission } =
//       await Location.requestBackgroundPermissionsAsync();
//     if (locationPermission === "granted") {
//       await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
//         accuracy: Location.Accuracy.Balanced,
//         timeInterval: 5 * 60 * 1000, // 5 minutes
//         distanceInterval: 500, // 500 meters
//         showsBackgroundLocationIndicator: false,
//       });
//       console.log("Background location registered");
//     } else {
//       console.warn("Background location permission not granted.");
//     }

//     await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
//       minimumInterval: METRICS_COLLECTION_INTERVAL,
//       stopOnTerminate: false,
//       startOnBoot: true,
//     });

//     console.log("Background fetch registered");
//     return true;
//   } catch (error) {
//     console.error("Error registering background tasks:", error);
//     return false;
//   }
// }

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
