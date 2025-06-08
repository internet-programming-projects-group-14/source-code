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
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import FeedbackPage from "../../components/FeedbackForm";
import NetInfo from "@react-native-community/netinfo";
import * as Device from "expo-device";
import * as Location from "expo-location";
import { requestAndroidPermissions } from "@/lib/permissions";
import { NetworkMetrics } from "@/types";

const { SignalModule } = NativeModules;

export default function NetworkQoEApp() {
  const router = useRouter();
  const [currentView, setCurrentView] = useState("main");
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [networkMetrics, setNetworkMetrics] = useState<NetworkMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const hasPermissions = await requestAndroidPermissions();
      console.log(hasPermissions);
      if (!hasPermissions) {
        throw new Error("Required permissions not granted");
      }

      // Location
      const { status } = await Location.requestForegroundPermissionsAsync();
      let locationData = null;
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({});
        locationData = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          accuracy: loc.coords.accuracy,
        };
      }

      // Signal metrics from native module
      const signalData = SignalModule?.getNetworkMetrics
        ? await SignalModule.getNetworkMetrics()
        : {
            signalStrength: null,
            networkType: null,
            carrier: null,
            frequency: null,
            bandwidth: null,
            cellId: null,
            pci: null,
          };

      // Connection & throughput
      const netInfo = await NetInfo.fetch();

      // Latency
      const start = Date.now();
      try {
        await fetch("http://localhost:3000/ping-google"); // replace with real backend URL
      } catch (err) {
        console.warn("Ping failed:", err);
      }
      const latency = Date.now() - start;

      const finalMetrics: NetworkMetrics = {
        signalStrength: signalData.signalStrength || null,
        networkType: signalData.networkType || netInfo.type,
        carrier: signalData.carrier || null,
        frequency: signalData.frequency || null,
        bandwidth: signalData.bandwidth || null,
        cellId: signalData.cellId || null,
        pci: signalData.pci || null,

        dataSpeed: null, // Optional: set if you benchmark it manually
        uploadSpeed: null,
        latency,
        isConnected: netInfo.isConnected,

        throughput: netInfo.details || null,
        location: locationData,

        device: {
          platform: Platform.OS,
          model: Device.modelName,
          osVersion: Device.osVersion,
        },
      };

      setNetworkMetrics(finalMetrics);
      console.log(finalMetrics);
    } catch (err) {
      console.error("Error collecting metrics:", err);
      setError(err instanceof Error ? err.message : "Failed to collect network metrics");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    fetchMetrics();
  };

  useEffect(() => {
    console.log("Here are your metrics ma'am");
    fetchMetrics();
  }, []);

  const getSignalQuality = (dbm: number | null) => {
    if (dbm === null) return { text: "Unknown", color: "#6b7280", bars: 0 };
    if (dbm >= -50) return { text: "Excellent", color: "#34d399", bars: 5 };
    if (dbm >= -60) return { text: "Very Good", color: "#6ee7b7", bars: 4 };
    if (dbm >= -70) return { text: "Good", color: "#facc15", bars: 3 };
    if (dbm >= -80) return { text: "Fair", color: "#fb923c", bars: 2 };
    return { text: "Poor", color: "#f87171", bars: 1 };
  };

  const signalQuality = getSignalQuality(networkMetrics?.signalStrength || null);

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
        networkMetrics={networkMetrics}
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

  // Loading State Component
  const LoadingCard = ({ title }: { title: string }) => (
    <View style={styles.card}>
      <View style={styles.loadingHeader}>
        <Text style={styles.cardTitle}>{title}</Text>
        <ActivityIndicator size="small" color="#93c5fd" />
      </View>
      <View style={styles.loadingContent}>
        <View style={styles.skeletonLine} />
        <View style={[styles.skeletonLine, { width: '70%' }]} />
        <View style={[styles.skeletonLine, { width: '80%' }]} />
      </View>
    </View>
  );

  // Error State Component
  const ErrorCard = () => (
    <View style={styles.card}>
      <View style={styles.errorContent}>
        <Feather name="alert-circle" size={24} color="#f87171" />
        <Text style={styles.errorTitle}>Unable to Load Network Data</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity onPress={handleRetry} style={styles.retryButton}>
          <Feather name="refresh-cw" size={16} color="#fff" />
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

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
        <TouchableOpacity 
          onPress={() => setCurrentView("settings")}
          disabled={isLoading}
          style={{ opacity: isLoading ? 0.5 : 1 }}
        >
          <Feather name="settings" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView>
        {/* Error State */}
        {error && !isLoading && <ErrorCard />}

        {/* Loading or Network Analysis Card */}
        {isLoading ? (
          <LoadingCard title="Network Analysis" />
        ) : networkMetrics ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Network Analysis</Text>
            <Text style={styles.statusBadge}>
              {networkMetrics.isConnected ? '🟢 Active' : '🔴 Disconnected'}
            </Text>

            <View style={styles.metricBlock}>
              <View style={styles.metric}>
                <Feather name="radio" size={16} color="#93c5fd" />
                <Text style={styles.metricLabel}> Signal Strength</Text>
                <Text style={{ color: signalQuality.color, fontWeight: "bold" }}>
                  {signalQuality.text}
                </Text>
                <Text style={styles.metricValue}>
                  {networkMetrics.signalStrength ? `${networkMetrics.signalStrength} dBm` : 'N/A'}
                </Text>
              </View>

              <View style={styles.metric}>
                <Feather name="zap" size={16} color="#93c5fd" />
                <Text style={styles.metricLabel}> Throughput</Text>
                <Text style={styles.metricValue}>
                  {networkMetrics.dataSpeed ? `${networkMetrics.dataSpeed} Mbps` : 'N/A'}
                </Text>
                <Text style={styles.metricValue}>
                  ↑ {networkMetrics.uploadSpeed ? `${networkMetrics.uploadSpeed} Mbps` : 'N/A'}
                </Text>
              </View>
            </View>

            <View style={styles.detailsBlock}>
              <View style={styles.detailsColumn}>
                <Text style={styles.detailItem}>
                  Type: {networkMetrics.networkType || 'Unknown'}
                </Text>
                <Text style={styles.detailItem}>
                  Freq: {networkMetrics.frequency || 'N/A'}
                </Text>
                <Text style={styles.detailItem}>
                  BW: {networkMetrics.bandwidth || 'N/A'}
                </Text>
              </View>
              <View style={styles.detailsColumn}>
                <Text style={styles.detailItem}>
                  Latency: {networkMetrics.latency ? `${networkMetrics.latency} ms` : 'N/A'}
                </Text>
                <Text style={styles.detailItem}>
                  Cell ID: {networkMetrics.cellId || 'N/A'}
                </Text>
                <Text style={styles.detailItem}>
                  PCI: {networkMetrics.pci || 'N/A'}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* Loading or Location Info Card */}
        {isLoading ? (
          <LoadingCard title="Location Info" />
        ) : networkMetrics ? (
          <View style={styles.card}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Feather name="map-pin" size={18} color="#34d399" />
              <View>
                <Text style={styles.cardTitle}>
                  {networkMetrics.location ? 'Location Detected' : 'Location Unknown'}
                </Text>
                <Text style={styles.detailItem}>
                  Carrier: {networkMetrics.carrier || 'Unknown'} • Contributing to area analytics
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* QoE Feedback - Always show unless error */}
        {!error && (
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
                  style={[
                    styles.emojiButton,
                    { opacity: isLoading ? 0.5 : 1 }
                  ]}
                  disabled={isLoading}
                >
                  <Text style={styles.emoji}>{item.emoji}</Text>
                  <Text style={styles.emojiLabel}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

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
              style={[
                styles.actionButton,
                { opacity: isLoading ? 0.5 : 1 }
              ]}
              disabled={isLoading}
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
  
  // Loading States
  loadingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  loadingContent: {
    gap: 8,
  },
  skeletonLine: {
    height: 12,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 6,
    width: "100%",
  },
  
  // Error States
  errorContent: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 20,
  },
  errorTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  errorMessage: {
    color: "#cbd5e1",
    fontSize: 14,
    textAlign: "center",
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#3b82f6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  retryText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
});
