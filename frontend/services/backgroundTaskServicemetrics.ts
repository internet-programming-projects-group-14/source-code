// services/backgroundTaskService.ts
import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as Device from "expo-device";
import { Platform, NativeModules } from "react-native";
import { measureThroughput } from "@/lib/calculateThroughput";
import { LocationData, DeviceInfo } from "@/lib/types";

const { SignalModule } = NativeModules;

// Task names
const BACKGROUND_FETCH_TASK = "background-fetch-metrics";
const BACKGROUND_LOCATION_TASK = "background-location-metrics";

// Configuration
const METRICS_COLLECTION_INTERVAL = 30 * 1000; // 15 seconds for testing

const STORAGE_KEY_PREFIX = "network_metrics_";
const MAX_STORED_METRICS = 100; // Keep last 100 readings

// Interfaces
export interface Metrics {
  timestamp: number;
  signalStrength: number | null;
  networkType: string | null;
  carrier: string | null;
  frequency: number | null;
  bandwidth: number | null;
  cellId: number | null;
  pci: number | null;
  throughput: string | null;
  latency: number | null;
  location: LocationData | null;
  device: DeviceInfo;
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

// Define the background fetch task
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    console.log("Background fetch task started");

    // Collect network metrics
    const metrics = await collectNetworkMetrics();

    // Store metrics locally
    await storeMetrics(metrics);

    // Optional: Send to server if needed
    await syncMetricsToServer();

    console.log("Network Background metrics collection completed");
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error("Network Background fetch error:", error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Define background location task for location-based metrics

TaskManager.defineTask(
  BACKGROUND_LOCATION_TASK,
  async ({
    data,
    error,
  }: TaskManager.TaskManagerTaskBody<
    { locations: Location.LocationObject[] } | undefined
  >) => {
    if (error) {
      console.error("Background location error:", error);
      return;
    }

    if (data) {
      const { locations } = data;
      console.log("Background location update:", locations);

      // Store location data
      await AsyncStorage.setItem(
        "last_background_location",
        JSON.stringify({
          location: locations[0],
          timestamp: Date.now(),
        })
      );
    }
  }
);

// Collect comprehensive network metrics
async function collectNetworkMetrics(): Promise<Metrics> {
  try {
    const timestamp = Date.now();

    // Get signal strength and cell info
    let signalData: any = null;
    if (SignalModule?.getNetworkMetrics) {
      signalData = await SignalModule.getNetworkMetrics();
    }

    // Get throughput
    const throughputData = await measureThroughput();

    // Get location (if available)
    let locationData: LocationData | null = null;
    try {
      const lastLocation = await AsyncStorage.getItem(
        "last_background_location"
      );
      if (lastLocation) {
        const parsedLocation = JSON.parse(lastLocation);
        // Use location if it's less than 30 minutes old
        if (timestamp - parsedLocation.timestamp < 30 * 60 * 1000) {
          locationData = parsedLocation.location;
        }
      }
    } catch (e) {
      console.log("No location data available", e);
    }

    // Measure latency
    let latency: number | null = null;
    try {
      const start = Date.now();
      await fetch("https://qoe-backend-ov95.onrender.com/ping-google", {
        method: "GET",
      });
      latency = Date.now() - start;
    } catch (e) {
      console.log("Latency measurement failed", e);
    }

    const cellInfo = signalData?.cellInfo?.[0] || {};

    const metrics: Metrics = {
      timestamp,
      signalStrength: cellInfo.signalStrength || null,
      networkType: cellInfo.type || null,
      carrier: signalData?.simCarrierName || null,
      frequency: cellInfo.earfcn || null,
      bandwidth: cellInfo.bandwidth || null,
      cellId: cellInfo.cellId || null,
      pci: cellInfo.pci || null,
      throughput: throughputData.throughput || null,
      latency,
      location: locationData
        ? {
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            accuracy: locationData.accuracy,
          }
        : null,
      device: {
        platform: Platform.OS,
        model: Device.modelName,
        osVersion: Device.osVersion,
      },
    };

    return metrics;
  } catch (error: any) {
    console.error("Error collecting background metrics:", error);
    return {
      timestamp: Date.now(),
      error: error.message,
    } as Metrics;
  }
}

// Store metrics locally
async function storeMetrics(metrics: Metrics): Promise<void> {
  try {
    // Get existing metrics
    const existingMetrics = await getStoredMetrics();

    // Add new metrics
    existingMetrics.push(metrics);

    // Keep only the last MAX_STORED_METRICS
    const trimmedMetrics = existingMetrics.slice(-MAX_STORED_METRICS);

    // Store back
    await AsyncStorage.setItem(
      `${STORAGE_KEY_PREFIX}data`,
      JSON.stringify(trimmedMetrics)
    );

    console.log(`Stored ${trimmedMetrics.length} metrics entries`);
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

// Sync metrics to server (optional)
async function syncMetricsToServer(): Promise<void> {
  console.log("I am syncing to server");
  try {
    const metrics = await getStoredMetrics();
    const unsyncedMetrics = metrics.filter((m) => !m.synced);

    if (unsyncedMetrics.length === 0) {
      return;
    }

    // Send to your backend API
    const response = await fetch(
      "https://qoe.onrender.com/api/background/network-feedback",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          metrics: unsyncedMetrics,
        }),
      }
    );

    if (response.ok) {
      // Mark as synced
      const updatedMetrics = metrics.map((m) =>
        unsyncedMetrics.includes(m) ? { ...m, synced: true } : m
      );

      await AsyncStorage.setItem(
        `${STORAGE_KEY_PREFIX}data`,
        JSON.stringify(updatedMetrics)
      );

      console.log(`Synced ${unsyncedMetrics.length} metrics to server`);
    }
  } catch (error) {
    console.error("Error syncing metrics:", error);
  }
}

// Register background tasks
export async function registerBackgroundTasks(): Promise<boolean> {
  try {
    // Register background fetch
    const fetchStatus = await BackgroundFetch.getStatusAsync();
    if (fetchStatus !== BackgroundFetch.BackgroundFetchStatus.Available) {
      console.log("Background fetch is not available");
      return false;
    }

    await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
      minimumInterval: METRICS_COLLECTION_INTERVAL,
      stopOnTerminate: false,
      startOnBoot: true,
    });

    console.log("Background fetch registered");

    // Register background location (optional)
    const { status } = await Location.requestBackgroundPermissionsAsync();
    if (status === "granted") {
      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: METRICS_COLLECTION_INTERVAL,
        distanceInterval: 1000, // 1km
      });
      console.log("Background location registered");
    }

    return true;
  } catch (error) {
    console.error("Error registering network metrics background tasks:", error);
    return false;
  }
}

// Unregister background tasks
export async function unregisterBackgroundTasks(): Promise<void> {
  try {
    await TaskManager.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    console.log("Background tasks unregistered");
  } catch (error) {
    console.error("Error unregistering background tasks:", error);
  }
}

// Get background task status
export async function getBackgroundTaskStatus(): Promise<BackgroundTaskStatus> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      BACKGROUND_FETCH_TASK
    );
    const fetchStatus = await BackgroundFetch.getStatusAsync();
    const locationStatus = await TaskManager.isTaskRegisteredAsync(
      BACKGROUND_LOCATION_TASK
    );

    return {
      backgroundFetch: {
        registered: isRegistered,
        status: fetchStatus, // Keep the original status
        statusText:
          fetchStatus !== null
            ? getBackgroundFetchStatusText(fetchStatus)
            : "Unknown", // Fallback for null
      },
      backgroundLocation: {
        registered: locationStatus,
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
  status: BackgroundFetch.BackgroundFetchStatus
): string {
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
