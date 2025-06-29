import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  SafeAreaView,
  StatusBar,
  Alert,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { resetUserId } from "@/lib/identityToken";
import * as SecureStore from "expo-secure-store";

export default function SystemConfiguration() {
  const router = useRouter();

  const openAppSettings = () => {
    Linking.openSettings().catch(() => {
      Alert.alert(
        "Unable to Open Settings",
        "Please open the settings manually to manage permissions."
      );
    });
  };

  const ToggleRow = ({
    title,
    description,
    value,
    onValueChange,
    showCritical = false,
    openSettings = false,
  }: {
    title: string;
    description: string;
    value: boolean;
    onValueChange?: (value: boolean) => void;
    showCritical?: boolean;
    openSettings?: boolean;
  }) => (
    <View style={styles.toggleRow}>
      <View style={styles.toggleContent}>
        <View style={styles.titleContainer}>
          <Text style={styles.toggleTitle}>{title}</Text>
          {showCritical && (
            <View style={styles.criticalBadge}>
              <Text style={styles.criticalText}>Critical</Text>
            </View>
          )}
        </View>
        <Text style={styles.toggleDescription}>{description}</Text>
      </View>
      {openSettings ? (
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={openAppSettings}
        >
          <Text style={styles.settingsButtonText}>Open Settings</Text>
        </TouchableOpacity>
      ) : (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: "#374151", true: "#3B82F6" }}
          thumbColor={value ? "#FFFFFF" : "#9CA3AF"}
        />
      )}
    </View>
  );

  const handleResetUserId = () => {
    Alert.alert(
      "Reset Device ID", // Alert Title
      "Are you sure you want to reset your Device ID? This action cannot be undone and resets your analytics history.", // Alert Message
      [
        {
          text: "Cancel",
          onPress: () => console.log("Reset cancelled"),
          style: "cancel", // This style makes it a "cancel" button
        },
        {
          text: "Reset",
          onPress: () => {
            // Put your actual reset logic here
            console.log("Device ID has been reset!");
            // Example: Your original reset function call
            // resetDeviceIdFunction();
          },
          style: "destructive", // This style can indicate a destructive action (often red text)
        },
      ],
      { cancelable: false } // Prevents dismissal by tapping outside the alert box
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1F2937" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.dismissAll()}
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>System Configuration</Text>
          <Text style={styles.headerSubtitle}>
            Network monitoring preferences
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Manage Permissions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="shield-outline" size={20} color="#FFFFFF" />
            <Text style={styles.sectionTitle}>Manage Permissions</Text>
          </View>

          <ToggleRow
            title="Location Services"
            description="Manage location permissions for geographic network analysis."
            value={true}
            openSettings={true} // Open settings instead of toggling
          />

          <ToggleRow
            title="Notifications"
            description="Manage notification permissions for QoE prompts."
            value={true}
            openSettings={true} // Open settings instead of toggling
          />

          <ToggleRow
            title="Phone State"
            description="Manage phone state permissions for network analysis."
            value={true}
            openSettings={true} // Open settings instead of toggling
          />
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.exportButton}
            onPress={handleResetUserId}
          >
            <Text style={styles.exportButtonText}>Reset Device ID</Text>
          </TouchableOpacity>
        </View>

        {/* System Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color="#FFFFFF"
            />
            <Text style={styles.sectionTitle}>System Information</Text>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>App Version</Text>
              <Text style={styles.infoValue}>v2.1.4</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Data Usage</Text>
              <Text style={styles.infoValue}>4.7 MB</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Reports Sent</Text>
              <Text style={styles.infoValue}>127</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Last Sync</Text>
              <Text style={styles.infoValue}>2 min ago</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111827",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#1F2937",
  },
  backButton: {
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: "#1F2937",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 8,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#374151",
  },
  toggleContent: {
    flex: 1,
    marginRight: 12,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  settingsButton: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  settingsButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },
  criticalBadge: {
    backgroundColor: "#DC2626",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  criticalText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  toggleDescription: {
    fontSize: 14,
    color: "#9CA3AF",
    lineHeight: 20,
  },
  frequencySection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#374151",
  },
  frequencyTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  frequencyOption: {
    backgroundColor: "#374151",
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    position: "relative",
  },
  frequencyOptionSelected: {
    backgroundColor: "#1E40AF",
    borderWidth: 1,
    borderColor: "#3B82F6",
  },
  frequencyLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  frequencyLabelSelected: {
    color: "#FFFFFF",
  },
  frequencyDescription: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  frequencyDescriptionSelected: {
    color: "#BFDBFE",
  },
  selectedIndicator: {
    position: "absolute",
    right: 16,
    top: "50%",
    marginTop: -6,
  },
  selectedDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#3B82F6",
  },
  infoGrid: {
    gap: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  actionButtons: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    gap: 12,
  },
  exportButton: {
    backgroundColor: "#374151",
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: "center",
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  resetButton: {
    backgroundColor: "transparent",
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: "center",
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#EF4444",
  },
});
