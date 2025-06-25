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
    const metrics = await collectNetworkMetrics();
    if (metrics && !metrics.error) {
      await storeMetrics(metrics);
      await syncMetricsToServer();
      console.log(`[Global] Task ${BACKGROUND_FETCH_TASK} completed`);
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } else {
      console.log(
        `[Global] Task ${BACKGROUND_FETCH_TASK} failed to collect metrics.`
      );
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }
  } catch (error) {
    console.error(`[Global] Task ${BACKGROUND_FETCH_TASK} error:`, error);
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
