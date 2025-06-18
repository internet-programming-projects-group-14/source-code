// app/_layout.tsx
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import { View, ActivityIndicator, Text } from "react-native";
import "react-native-reanimated";
import { useColorScheme } from "@/hooks/useColorScheme";
import {
  ErrorBoundary,
  NavigationErrorFallback,
} from "@/components/ErrorBoundary";

// Loading component
function LoadingScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: isDark ? "#000" : "#fff",
      }}
    >
      <ActivityIndicator size="large" color={isDark ? "#007AFF" : "#007AFF"} />
      <Text
        style={{
          marginTop: 16,
          fontSize: 16,
          color: isDark ? "#fff" : "#000",
        }}
      >
        Loading...
      </Text>
    </View>
  );
}

// Custom hook for managing launch state
function useLaunchState() {
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkFirstLaunch = async () => {
    try {
      setError(null);
      const hasLaunched = await SecureStore.getItemAsync("hasLaunched");
      console.log("Launch check result:", hasLaunched);

      if (!hasLaunched) {
        await SecureStore.setItemAsync("hasLaunched", "true");
        setIsFirstLaunch(true);
      } else {
        setIsFirstLaunch(false);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error("Failed to check launch status:", err);
      setError(errorMessage);
      // Fallback to assuming not first launch
      setIsFirstLaunch(false);
    }
  };

  return { isFirstLaunch, error, checkFirstLaunch };
}

// Main layout component
function AppLayout() {
  const colorScheme = useColorScheme();
  const [loaded, fontError] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });
  const { isFirstLaunch, error, checkFirstLaunch } = useLaunchState();

  useEffect(() => {
    if (loaded && !fontError) {
      checkFirstLaunch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, fontError]);

  // Show loading while fonts load or launch state is being determined
  if (!loaded || isFirstLaunch === null) {
    return <LoadingScreen />;
  }

  // Handle font loading error
  if (fontError) {
    console.error("Font loading error:", fontError);
    // Continue with default fonts
  }

  // Show error message if there was a storage error (optional)
  if (error) {
    console.warn(
      "Storage error occurred, but continuing with fallback:",
      error
    );
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack initialRouteName={isFirstLaunch ? "onboarding" : "onboarding"}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
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
