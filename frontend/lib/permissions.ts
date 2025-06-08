import { PermissionsAndroid, Platform, Alert } from "react-native";

export async function requestAndroidPermissions() {
  if (Platform.OS !== "android") return true;

  try {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
    ]);

    const allGranted = Object.values(granted).every(
      (result) => result === PermissionsAndroid.RESULTS.GRANTED
    );

    if (!allGranted) {
      Alert.alert(
        "Permissions Required",
        "To accurately measure network quality, we need access to your location and phone state. Please grant the requested permissions.",
        [{ text: "OK", style: "default" }]
      );
    }
    else{
      console.log('All permissions granted')
    }

    return allGranted;
  } catch (err) {
    console.error("Permission error:", err);
    Alert.alert(
      "Permission Error",
      "Something went wrong while requesting permissions. Please try again."
    );
    return false;
  }
}
