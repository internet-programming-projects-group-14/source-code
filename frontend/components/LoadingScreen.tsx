import { View, ActivityIndicator, Text, useColorScheme } from "react-native";

// Loading component
export function LoadingScreen() {
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
