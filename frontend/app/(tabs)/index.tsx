import { requestAndroidPermissions } from "@/lib/permissions";
import { NetworkMetrics } from "@/lib/types";
import { Feather } from "@expo/vector-icons";
import NetInfo from "@react-native-community/netinfo";
import * as Device from "expo-device";
import * as Location from "expo-location";
import { RelativePathString, useRouter } from "expo-router";
import React, { useEffect, useState, useRef } from "react";
import {
  ActivityIndicator,
  NativeModules,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  AppState,
  Modal,
  Animated,
  StatusBar,
  Dimensions,
  AppStateStatus,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import FeedbackPage from "../../components/FeedbackForm";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "expo-blur";

const { SignalModule } = NativeModules;
const { width, height } = Dimensions.get("window");

// QoE Popup Component
const QoEPopup: React.FC<{
  visible: boolean;
  onClose: () => void;
  onEmojiSelect: (rating: number) => void;
  triggerReason: "periodic" | "signal" | null;
}> = ({ visible, onClose, onEmojiSelect, triggerReason }) => {
  const scaleValue = useRef(new Animated.Value(0)).current;
  const opacityValue = useRef(new Animated.Value(0)).current;

  const getMessage = (): string => {
    switch (triggerReason) {
      case "signal":
        return "📶 Poor signal detected - How's your network experience?";
      case "periodic":
        return "📶 Rate your QoE - Help us improve network quality";
      default:
        return "📶 Rate your network experience";
    }
  };

  const emojiOptions = [
    { emoji: "😞", label: "Poor", value: 1, color: "#f87171" },
    { emoji: "😐", label: "Fair", value: 2, color: "#fb923c" },
    { emoji: "🙂", label: "Good", value: 3, color: "#facc15" },
    { emoji: "😊", label: "Great", value: 4, color: "#6ee7b7" },
    { emoji: "🤩", label: "Excellent", value: 5, color: "#34d399" },
  ];

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleValue, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.timing(opacityValue, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleValue, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityValue, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar backgroundColor="rgba(0,0,0,0.5)" barStyle="light-content" />
      <View style={styles.overlay}>
        <BlurView intensity={20} style={StyleSheet.absoluteFillObject} />
        <Animated.View
          style={[
            styles.popupContainer,
            {
              transform: [{ scale: scaleValue }],
              opacity: opacityValue,
            },
          ]}
        >
          <TouchableOpacity onPress={onClose} style={styles.popupCloseButton}>
            <Feather name="x" size={20} color="#6b7280" />
          </TouchableOpacity>

          <View style={styles.popupHeader}>
            <View style={styles.popupIconContainer}>
              <Feather name="activity" size={24} color="#3b82f6" />
            </View>
            <Text style={styles.popupTitle}>Network QoE</Text>
            <Text style={styles.popupMessage}>{getMessage()}</Text>
          </View>

          <View style={styles.popupEmojiContainer}>
            {emojiOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => onEmojiSelect(option.value)}
                style={styles.popupEmojiButton}
                activeOpacity={0.7}
              >
                <Text style={styles.popupEmoji}>{option.emoji}</Text>
                <Text style={[styles.popupEmojiLabel, { color: option.color }]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.popupFooter}>
            Your feedback helps improve network quality for everyone
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default function NetworkQoEApp() {
  const router = useRouter();
  const [currentView, setCurrentView] = useState("main");
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [networkMetrics, setNetworkMetrics] = useState<NetworkMetrics | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] =
    useState<Location.LocationGeocodedAddress | null>(null);

  // QoE Popup state
  const [shouldShowPopup, setShouldShowPopup] = useState(false);
  const [popupTriggerReason, setPopupTriggerReason] = useState<
    "periodic" | "signal" | null
  >(null);
  const appState = useRef(AppState.currentState);
  const periodicTimerRef = useRef<number | null>(null);
  const signalCheckTimerRef = useRef<number | null>(null);

  const config = {
    periodicInterval: 30000, // 4 hours
    signalThreshold: -85, // dBm threshold for poor signal
    minTimeBetweenPopups: 10000, // 30 minutes between popups
  };

  // Check if enough time has passed since last popup
  const canShowPopup = async (): Promise<boolean> => {
    try {
      const lastPopupTime = await AsyncStorage.getItem("qoe_last_popup_time");
      if (!lastPopupTime) return true;

      const timeSinceLastPopup = Date.now() - parseInt(lastPopupTime, 10);
      return timeSinceLastPopup >= config.minTimeBetweenPopups;
    } catch (error) {
      console.error("Error checking popup eligibility:", error);
      return true;
    }
  };

  // Record popup shown time
  const recordPopupShown = async (): Promise<void> => {
    try {
      await AsyncStorage.setItem("qoe_last_popup_time", Date.now().toString());

      // Increment popup count for analytics
      const currentCount = await AsyncStorage.getItem("qoe_popup_count");
      const newCount = currentCount ? parseInt(currentCount, 10) + 1 : 1;
      await AsyncStorage.setItem("qoe_popup_count", newCount.toString());
    } catch (error) {
      console.error("Error recording popup:", error);
    }
  };

  // Trigger popup with reason
  const triggerPopup = async (reason: "periodic" | "signal"): Promise<void> => {
    const canShow = await canShowPopup();
    if (canShow) {
      setPopupTriggerReason(reason);
      setShouldShowPopup(true);
      await recordPopupShown();
    }
  };

  // Check for poor signal strength
  const checkSignalStrength = async (): Promise<void> => {
    if (
      networkMetrics?.signalStrength !== undefined &&
      networkMetrics.signalStrength !== null &&
      networkMetrics.signalStrength < config.signalThreshold
    ) {
      console.log(`Poor signal detected: ${networkMetrics.signalStrength} dBm`);
      await triggerPopup("signal");
    }
  };

  // Setup periodic timer
  const setupPeriodicTimer = (): void => {
    if (periodicTimerRef.current !== null) {
      clearInterval(periodicTimerRef.current);
      periodicTimerRef.current = null;
    }

    periodicTimerRef.current = setInterval(async () => {
      console.log("Periodic QoE check triggered");
      await triggerPopup("periodic");
    }, config.periodicInterval) as unknown as number;
  };

  // Setup signal monitoring
  const setupSignalMonitoring = (): void => {
    if (signalCheckTimerRef.current !== null) {
      clearInterval(signalCheckTimerRef.current);
      signalCheckTimerRef.current = null;
    }

    // Check signal every 30 seconds when app is active
    signalCheckTimerRef.current = setInterval(async () => {
      if (appState.current === "active") {
        await checkSignalStrength();
      }
    }, 30000) as unknown as number;
  };

  // Handle app state changes
  const handleAppStateChange = (nextAppState: AppStateStatus): void => {
    if (
      appState.current.match(/inactive|background/) &&
      nextAppState === "active"
    ) {
      console.log("App has come to the foreground");
      // Check if we should show popup based on time elapsed
      checkPeriodicTrigger();
    }
    appState.current = nextAppState;
  };

  // Check if periodic popup should be triggered based on elapsed time
  const checkPeriodicTrigger = async (): Promise<void> => {
    try {
      const lastPopupTime = await AsyncStorage.getItem("qoe_last_popup_time");
      if (!lastPopupTime) {
        await triggerPopup("periodic");
        return;
      }

      const timeSinceLastPopup = Date.now() - parseInt(lastPopupTime, 10);
      if (timeSinceLastPopup >= config.periodicInterval) {
        await triggerPopup("periodic");
      }
    } catch (error) {
      console.error("Error checking periodic trigger:", error);
    }
  };

  // Dismiss popup
  const dismissPopup = (): void => {
    setShouldShowPopup(false);
    setPopupTriggerReason(null);
  };

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
        };

        const [address] = await Location.reverseGeocodeAsync(locationData);
        setAddress(address);
        locationData = { ...locationData, accuracy: loc.coords.accuracy };
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
        await fetch("https://qoe-backend-ov95.onrender.com/ping-google");
      } catch (err) {
        console.warn("Ping failed:", err);
      }
      const latency = Date.now() - start;

      const finalMetrics: NetworkMetrics = {
        signalStrength: signalData.signalStrength || null,
        networkType: signalData.networkType || netInfo.type,
        carrier: netInfo.details?.carrier || null,
        frequency: signalData.frequency || null,
        bandwidth: signalData.bandwidth || null,
        cellId: signalData.cellId || null,
        pci: signalData.pci || null,

        dataSpeed: null,
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

      // Check signal strength after metrics are loaded
      if (finalMetrics.signalStrength !== null) {
        checkSignalStrength();
      }
    } catch (err) {
      console.error("Error collecting metrics:", err);
      setError(
        err instanceof Error ? err.message : "Failed to collect network metrics"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    fetchMetrics();
  };

  useEffect(() => {
    fetchMetrics();

    // Setup QoE popup monitoring
    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );
    setupPeriodicTimer();
    setupSignalMonitoring();

    return () => {
      subscription?.remove();
      if (periodicTimerRef.current !== null) {
        clearInterval(periodicTimerRef.current);
        periodicTimerRef.current = null;
      }
      if (signalCheckTimerRef.current !== null) {
        clearInterval(signalCheckTimerRef.current);
        signalCheckTimerRef.current = null;
      }
    };
  }, []);

  const getSignalQuality = (dbm: number | null) => {
    if (dbm === null) return { text: "Unknown", color: "#6b7280", bars: 0 };
    if (dbm >= -50) return { text: "Excellent", color: "#34d399", bars: 5 };
    if (dbm >= -60) return { text: "Very Good", color: "#6ee7b7", bars: 4 };
    if (dbm >= -70) return { text: "Good", color: "#facc15", bars: 3 };
    if (dbm >= -80) return { text: "Fair", color: "#fb923c", bars: 2 };
    return { text: "Poor", color: "#f87171", bars: 1 };
  };

  const signalQuality = getSignalQuality(
    networkMetrics?.signalStrength || null
  );

  const handleEmojiRating = (rating: number) => {
    setSelectedRating(rating);
    setCurrentView("feedback");
    dismissPopup();
  };

  const handleManualEmojiRating = (rating: number) => {
    setSelectedRating(rating);
    setCurrentView("feedback");
  };

  const handleBackToMain = () => {
    setCurrentView("main");
    setSelectedRating(null);
  };

  if (currentView === "feedback") {
    return (
      <FeedbackPage
        selectedRating={selectedRating}
        onBack={handleBackToMain}
        address={address}
        showRatingSelection={false}
        networkMetrics={networkMetrics}
        setCurrentView={setCurrentView}
      />
    );
  }

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

  const LoadingCard = ({ title }: { title: string }) => (
    <View style={styles.card}>
      <View style={styles.loadingHeader}>
        <Text style={styles.cardTitle}>{title}</Text>
        <ActivityIndicator size="small" color="#93c5fd" />
      </View>
      <View style={styles.loadingContent}>
        <View style={styles.skeletonLine} />
        <View style={[styles.skeletonLine, { width: "70%" }]} />
        <View style={[styles.skeletonLine, { width: "80%" }]} />
      </View>
    </View>
  );

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
      {/* QoE Feedback Popup */}
      <QoEPopup
        visible={shouldShowPopup}
        onClose={dismissPopup}
        onEmojiSelect={handleEmojiRating}
        triggerReason={popupTriggerReason}
      />

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
          onPress={() => router.navigate("/settings")}
          disabled={isLoading}
          style={{ opacity: isLoading ? 0.5 : 1 }}
        >
          <Feather name="settings" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView>
        {error && !isLoading && <ErrorCard />}

        {isLoading ? (
          <LoadingCard title="Network Analysis" />
        ) : networkMetrics ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Network Analysis</Text>
            <Text style={styles.statusBadge}>
              {!isLoading ? "🟢 Active" : "🔴 Disconnected"}
            </Text>

            <View style={styles.metricBlock}>
              <View style={styles.metric}>
                <Feather name="radio" size={16} color="#93c5fd" />
                <Text style={styles.metricLabel}> Signal Strength</Text>
                <Text
                  style={{ color: signalQuality.color, fontWeight: "bold" }}
                >
                  {signalQuality.text}
                </Text>
                <Text style={styles.metricValue}>
                  {networkMetrics.signalStrength
                    ? `${networkMetrics.signalStrength} dBm`
                    : "N/A"}
                </Text>
              </View>

              <View style={styles.metric}>
                <Feather name="zap" size={16} color="#93c5fd" />
                <Text style={styles.metricLabel}> Throughput</Text>
                <Text style={styles.metricValue}>
                  {networkMetrics.dataSpeed
                    ? `${networkMetrics.dataSpeed} Mbps`
                    : "N/A"}
                </Text>
                <Text style={styles.metricValue}>
                  ↑{" "}
                  {networkMetrics.uploadSpeed
                    ? `${networkMetrics.uploadSpeed} Mbps`
                    : "N/A"}
                </Text>
              </View>
            </View>

            <View style={styles.detailsBlock}>
              <View style={styles.detailsColumn}>
                <Text style={styles.detailItem}>
                  Type: {networkMetrics.networkType || "Unknown"}
                </Text>
                <Text style={styles.detailItem}>
                  Freq: {networkMetrics.frequency || "N/A"}
                </Text>
                <Text style={styles.detailItem}>
                  BW: {networkMetrics.bandwidth || "N/A"}
                </Text>
              </View>
              <View style={styles.detailsColumn}>
                <Text style={styles.detailItem}>
                  Latency:{" "}
                  {networkMetrics.latency
                    ? `${networkMetrics.latency} ms`
                    : "N/A"}
                </Text>
                <Text style={styles.detailItem}>
                  Cell ID: {networkMetrics.cellId || "N/A"}
                </Text>
                <Text style={styles.detailItem}>
                  PCI: {networkMetrics.pci || "N/A"}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {isLoading ? (
          <LoadingCard title="Location Info" />
        ) : networkMetrics ? (
          <View style={styles.card}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <Feather name="map-pin" size={18} color="#34d399" />
              <View>
                <Text style={styles.cardTitle}>
                  {networkMetrics.location && address
                    ? address.name + " " + address.city
                    : "Location Unknown"}
                </Text>
                <Text style={styles.detailItem}>
                  Carrier: {networkMetrics.carrier || "Unknown"}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

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
                  onPress={() => handleManualEmojiRating(item.value)}
                  style={[styles.emojiButton, { opacity: isLoading ? 0.5 : 1 }]}
                  disabled={isLoading}
                >
                  <Text style={styles.emoji}>{item.emoji}</Text>
                  <Text style={styles.emojiLabel}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

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
              style={[styles.actionButton, { opacity: isLoading ? 0.5 : 1 }]}
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
  // QoE Popup styles
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  popupContainer: {
    backgroundColor: "#1f2937",
    borderRadius: 20,
    padding: 24,
    width: Math.min(width - 40, 360),
    maxHeight: height * 0.8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
    borderWidth: 1,
    borderColor: "#374151",
  },
  popupCloseButton: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 1,
    padding: 4,
  },
  popupHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  popupIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#1e40af20",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  popupTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  popupMessage: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
    lineHeight: 20,
  },
  popupEmojiContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  popupEmojiButton: {
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#374151",
    minWidth: 52,
    flex: 1,
    marginHorizontal: 2,
  },
  popupEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  popupEmojiLabel: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  popupFooter: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    fontStyle: "italic",
  },
});
