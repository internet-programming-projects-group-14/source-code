// app/index.tsx
import { useEffect } from "react";
import { Redirect } from "expo-router";
import { useLaunchState } from "@/hooks/useLaunch";
import { LoadingScreen } from "@/components/LoadingScreen";

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
