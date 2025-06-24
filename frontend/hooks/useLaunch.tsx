import { useState } from "react";
import * as SecureStore from "expo-secure-store";

const USER_ID_KEY = "user_unique_id";
export function useLaunchState() {
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkFirstLaunch = async () => {
    try {
      setError(null);
      const userId = await SecureStore.getItemAsync(USER_ID_KEY);
      setIsFirstLaunch(!userId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Error checking launch state:", err);
      setError(message);
      setIsFirstLaunch(false); // fallback: assume it's not first launch
    }
  };

  return { isFirstLaunch, error, checkFirstLaunch };
}
