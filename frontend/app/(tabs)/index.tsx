import { Feather } from "@expo/vector-icons";
import { RelativePathString, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  NativeModules,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import FeedbackPage from "../../components/FeedbackForm";
import NetInfo from "@react-native-community/netinfo";
import { NetworkInfo } from "react-native-network-info";
import DeviceInfo from "react-native-device-info";
import { requestAndroidPermissions } from "@/lib/permissions";

const { SignalModule } = NativeModules;

export default function NetworkQoEApp() {
  const router = useRouter();
  const [currentView, setCurrentView] = useState("main");
  const [selectedRating, setSelectedRating] = useState<number | null>(null);

  const networkMetrics = {
    signalStrength: -65,
    dataSpeed: 45.2,
    uploadSpeed: 12.8,
    latency: 23,
    networkType: "LTE",
    carrier: "Orange Cameroon",
    frequency: "3.7 GHz",
    bandwidth: "100 MHz",
    location: "Dirty South",
    cellId: "0x1A2B3C",
    pci: 156,
  };

  const fetchMetrics = async () => {
    try {
      const hasPermissions = await requestAndroidPermissions();
      if (!hasPermissions) return;

      console.log("Available modules:", Object.keys(NativeModules));

      if (SignalModule) {
        const signalData = await SignalModule.getNetworkMetrics();
        console.log("Signal data received:", signalData);
      }

      const netInfo = await NetInfo.fetch();
      const carrier = await DeviceInfo.getCarrier();
      const device = await DeviceInfo.getSystemName();

      const start = Date.now();
      await fetch("https://www.google.com", { method: "HEAD" });
      const latency = Date.now() - start;

      const finalMetrics = {
        // ...signalData,
        carrier,
        device,
        throughput: netInfo.details,
        latency,
        isConnected: netInfo.isConnected,
      };

      console.log(finalMetrics);
    } catch (err) {
      console.error("Error collecting metrics:", err);
    }
  };

  useEffect(() => {
    console.log("Here are your metrics ma'am");
    fetchMetrics();
  }, []);

  const getSignalQuality = (dbm: number) => {
    if (dbm >= -50) return { text: "Excellent", color: "#34d399", bars: 5 };
    if (dbm >= -60) return { text: "Very Good", color: "#6ee7b7", bars: 4 };
    if (dbm >= -70) return { text: "Good", color: "#facc15", bars: 3 };
    if (dbm >= -80) return { text: "Fair", color: "#fb923c", bars: 2 };
    return { text: "Poor", color: "#f87171", bars: 1 };
  };

  const signalQuality = getSignalQuality(networkMetrics.signalStrength);

  const handleEmojiRating = (rating: number) => {
    setSelectedRating(rating);
    setCurrentView("feedback");
  };

  const handleBackToMain = () => {
    setCurrentView("main");
    setSelectedRating(null); // Reset rating when going back
  };

  // Show FeedbackPage when currentView is "feedback"
  if (currentView === "feedback") {
    return (
      <FeedbackPage
        selectedRating={selectedRating}
        onBack={handleBackToMain}
        showRatingSelection={false} // Show feedback form, not rating selection
      />
    );
  }

  // Show other placeholder pages
  if (currentView !== "main") {
    return (
      <View style={styles.centered}>
        <Text style={styles.heading}>{currentView} Page</Text>
        <TouchableOpacity onPress={handleBackToMain}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.signalIcon}>
            <Feather name="activity" size={18} color="#93c5fd" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Network QoE Monitor</Text>
            <Text style={styles.headerSubtitle}>
              Real-time Quality Analysis
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => setCurrentView("settings")}>
          <Feather name="settings" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      <ScrollView>
        {/* Card: Network Analysis */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Network Analysis</Text>
          <Text style={styles.statusBadge}>🟢 Active</Text>

          <View style={styles.metricBlock}>
            <View style={styles.metric}>
              <Feather name="radio" size={16} color="#93c5fd" />
              <Text style={styles.metricLabel}> Signal Strength</Text>
              <Text style={{ color: signalQuality.color, fontWeight: "bold" }}>
                {signalQuality.text}
              </Text>
              <Text style={styles.metricValue}>
                {networkMetrics.signalStrength} dBm
              </Text>
            </View>

            <View style={styles.metric}>
              <Feather name="zap" size={16} color="#93c5fd" />
              <Text style={styles.metricLabel}> Throughput</Text>
              <Text style={styles.metricValue}>
                {networkMetrics.dataSpeed} Mbps
              </Text>
              <Text style={styles.metricValue}>
                ↑ {networkMetrics.uploadSpeed} Mbps
              </Text>
            </View>
          </View>

          <View style={styles.detailsBlock}>
            <View style={styles.detailsColumn}>
              <Text style={styles.detailItem}>
                Type: {networkMetrics.networkType}
              </Text>
              <Text style={styles.detailItem}>
                Freq: {networkMetrics.frequency}
              </Text>
              <Text style={styles.detailItem}>
                BW: {networkMetrics.bandwidth}
              </Text>
            </View>
            <View style={styles.detailsColumn}>
              <Text style={styles.detailItem}>
                Latency: {networkMetrics.latency} ms
              </Text>
              <Text style={styles.detailItem}>
                Cell ID: {networkMetrics.cellId}
              </Text>
              <Text style={styles.detailItem}>PCI: {networkMetrics.pci}</Text>
            </View>
          </View>
        </View>

        {/* Card: Location Info */}
        <View style={styles.card}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Feather name="map-pin" size={18} color="#34d399" />
            <View>
              <Text style={styles.cardTitle}>{networkMetrics.location}</Text>
              <Text style={styles.detailItem}>
                Carrier: {networkMetrics.carrier} • Contributing to area
                analytics
              </Text>
            </View>
          </View>
        </View>

        {/* QoE Feedback */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Rate Your Network Experience</Text>
          <Text style={styles.headerSubtitle}>
            Help improve network quality
          </Text>

          <View style={styles.emojiRow}>
            {[
              { emoji: "😞", label: "Poor", value: 1 },
              { emoji: "😐", label: "Fair", value: 2 },
              { emoji: "🙂", label: "Good", value: 3 },
              { emoji: "😊", label: "Great", value: 4 },
              { emoji: "🤩", label: "Excellent", value: 5 },
            ].map((item) => (
              <TouchableOpacity
                key={item.value}
                onPress={() => handleEmojiRating(item.value)}
                style={styles.emojiButton}
              >
                <Text style={styles.emoji}>{item.emoji}</Text>
                <Text style={styles.emojiLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Navigation Buttons */}
        <View style={styles.actionList}>
          {[
            {
              icon: "bar-chart",
              text: "QoE Analytics & Metrics",
              view: "statistics",
            },
            {
              icon: "users",
              text: "Community Network Data",
              view: "community",
            },
            {
              icon: "trending-up",
              text: "Network Speed Test",
              view: "speed-test",
            },
          ].map((item) => (
            <TouchableOpacity
              key={item.view}
              onPress={() => router.push(`/${item.view}` as RelativePathString)}
              style={styles.actionButton}
            >
              <View style={styles.actionButtonInner}>
                <Feather name={item.icon as any} size={18} color="#fff" />
                <Text style={styles.actionText}>{item.text}</Text>
              </View>
              <Feather name="chevron-right" size={18} color="#ccc" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 20,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  headerContent: { flexDirection: "row", alignItems: "center", gap: 12 },
  signalIcon: {
    width: 32,
    height: 32,
    backgroundColor: "#3b82f680",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  headerSubtitle: { color: "#93c5fd", fontSize: 12 },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    margin: 10,
    padding: 16,
    borderRadius: 12,
  },
  cardTitle: { color: "#fff", fontWeight: "600", fontSize: 16 },
  statusBadge: { color: "#10b981", marginTop: 6, marginBottom: 12 },
  metricBlock: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  metric: { flex: 1, gap: 4 },
  metricLabel: { color: "#cbd5e1", fontSize: 12 },
  metricValue: { color: "#fff", fontWeight: "500" },
  detailsBlock: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  detailsColumn: { gap: 6 },
  detailItem: { color: "#cbd5e1", fontSize: 12 },
  emojiRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 16,
  },
  emojiButton: { alignItems: "center" },
  emoji: { fontSize: 28 },
  emojiLabel: { color: "#cbd5e1", fontSize: 12, marginTop: 4 },
  actionList: { paddingHorizontal: 12, marginTop: 20 },
  actionButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#334155",
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: "center",
  },
  actionButtonInner: { flexDirection: "row", alignItems: "center", gap: 10 },
  actionText: { color: "#fff", fontSize: 14, fontWeight: "500" },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 80,
  },
  heading: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
  },
  back: { color: "#60a5fa", marginTop: 8 },
});
