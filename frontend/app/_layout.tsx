// app/_layout.tsx
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";
import { useColorScheme } from "@/hooks/useColorScheme";
import {
  ErrorBoundary,
  NavigationErrorFallback,
} from "@/components/ErrorBoundary";
import { useLaunchState } from "@/hooks/useLaunch";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useBackgroundMetrics } from "@/hooks/useBackgroundMetrics";

function AppLayout() {
  const colorScheme = useColorScheme();
  const [loaded, fontError] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });
  const { isFirstLaunch, error, checkFirstLaunch } = useLaunchState();

  useEffect(() => {
    checkFirstLaunch();
  }, []);

  const { backgroundStatus } = useBackgroundMetrics();

  useEffect(() => {
    console.log(
      "[RootLayout] Initial background status:",
      JSON.stringify(backgroundStatus)
    );
  }, []);

  // Block rendering while fonts or launch state are loading
  if (!loaded || isFirstLaunch === null) {
    return <LoadingScreen />;
  }

  // Handle font loading error
  if (fontError) {
    console.error("Font loading error:", fontError);
  }

  if (error) {
    console.warn(
      "Storage error occurred, but continuing with fallback:",
      error
    );
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

// Root component with error boundaries
export default function RootLayout() {
  return (
    <ErrorBoundary fallback={NavigationErrorFallback}>
      <AppLayout />
    </ErrorBoundary>
  );
}
