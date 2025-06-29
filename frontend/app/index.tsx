// app/index.tsx
import { useEffect } from "react";
import { Redirect } from "expo-router";
import { useLaunchState } from "@/hooks/useLaunch";
import { LoadingScreen } from "@/components/LoadingScreen";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import {
  BACKGROUND_FETCH_TASK,
  BACKGROUND_LOCATION_TASK,
  collectNetworkMetrics,
  storeMetrics,
  syncMetricsToServer,
} from "../services/backgroundTaskServicemetrics"; // Adjust path if needed
import * as BackgroundFetch from "expo-background-fetch";

// Background metrics task definition


TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    console.log(`[Global] Task ${BACKGROUND_FETCH_TASK} started`);

    // Step 1: Collect new metrics
    const metrics = await collectNetworkMetrics();

    if (metrics && !metrics.error) {
      // Step 2: Store metrics locally
      await storeMetrics(metrics);
      console.log(`[Global] Metrics collected and stored locally`);

      // Step 3: Attempt to sync all unsynced metrics to server
      try {
        await syncMetricsToServer();
        console.log(`[Global] Metrics synced to server successfully`);
        return BackgroundFetch.BackgroundFetchResult.NewData;
      } catch (syncError) {
        console.error(`[Global] Failed to sync metrics to server:`, syncError);
        // Even if sync fails, we still collected new data
        return BackgroundFetch.BackgroundFetchResult.NewData;
      }
    } else {
      console.log(
        `[Global] Task ${BACKGROUND_FETCH_TASK} failed to collect metrics.`
      );

      // Step 4: Even if we didn't collect new metrics, try to sync existing unsynced ones
      try {
        await syncMetricsToServer();
        console.log(`[Global] Attempted to sync existing unsynced metrics`);
        return BackgroundFetch.BackgroundFetchResult.NoData;
      } catch (syncError) {
        console.error(`[Global] Failed to sync existing metrics:`, syncError);
        return BackgroundFetch.BackgroundFetchResult.NoData;
      }
    }
  } catch (error) {
    console.error(`[Global] Task ${BACKGROUND_FETCH_TASK} error:`, error);

    // Step 5: As a last resort, try to sync any existing metrics even on error
    try {
      await syncMetricsToServer();
      console.log(`[Global] Emergency sync attempt completed`);
    } catch (syncError) {
      console.error(`[Global] Emergency sync also failed:`, syncError);
    }

    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// 2. Define the background location task

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
    if (data?.locations) {
      console.log("Background location update:", data.locations[0]);
      await AsyncStorage.setItem(
        "last_background_location",
        JSON.stringify({
          location: data.locations[0].coords,
          timestamp: Date.now(),
        })
      );
    }
  }
);
export default function Index() {
  const { isFirstLaunch, error, checkFirstLaunch } = useLaunchState();

  useEffect(() => {
    checkFirstLaunch();
  }, []);

  // Show loading while determining launch state
  if (isFirstLaunch === null) {
    return <LoadingScreen />;
  }

  // Handle any storage errors (optional - you might want to show an error screen)
  if (error) {
    console.warn("Storage error in index:", error);
  }

  // Redirect based on first launch status
  if (isFirstLaunch) {
    return <Redirect href="/onboarding" />;
  } else {
    return <Redirect href="/(tabs)" />;
  }
}
