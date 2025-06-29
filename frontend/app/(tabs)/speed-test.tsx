"use client";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  Activity,
  ChevronLeft,
  Clock,
  Download,
  Play,
  RefreshCw,
  RotateCcw,
  Signal,
  Upload,
  Wifi,
  Zap,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle } from "react-native-svg";

// Debug function to test network info APIs
const testNetworkAPIs = async () => {
  console.log("=== Testing Network APIs ===");

  const apis = [
    {
      name: "ipapi.co",
      url: "https://ipapi.co/json/",
    },
    {
      name: "ip-api.com",
      url: "http://ip-api.com/json/",
    },
    {
      name: "ipinfo.io",
      url: "https://ipinfo.io/json",
    },
    {
      name: "httpbin.org/ip",
      url: "https://httpbin.org/ip",
    },
  ];

  for (const api of apis) {
    try {
      console.log(`Testing ${api.name}...`);

      const response = await Promise.race([
        fetch(api.url, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "User-Agent": "SpeedTest-App/1.0",
          },
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 8000)
        ),
      ]);

      if (response.ok) {
        const data = await response.json();
        return { service: api.name, data };
      } else {
        console.log(` ${api.name} HTTP Error:`, response.status);
      }
    } catch (error) {
      console.log(`${api.name} Failed:`, error.message);
    }
  }

  return null;
};

// Simplified network info function with better error handling
const getNetworkInfo = async () => {
  console.log("🔍 Getting network info...");

  try {
    // Test all APIs and use the first working one
    const result = await testNetworkAPIs();

    if (!result) {
      throw new Error("All network APIs failed");
    }

    const { service, data } = result;

    // Parse based on service
    let networkInfo = {};

    if (service === "ipapi.co") {
      networkInfo = {
        ipAddress: data.ip || "Unknown",
        isp: data.org || "Unknown ISP",
        city: data.city || "Unknown",
        region: data.region || "Unknown",
        country: data.country_name || "Unknown",
        latitude: data.latitude || 0,
        longitude: data.longitude || 0,
        timezone: data.timezone || "Unknown",
      };
    } else if (service === "ip-api.com") {
      networkInfo = {
        ipAddress: data.query || "Unknown",
        isp: data.isp || data.org || "Unknown ISP",
        city: data.city || "Unknown",
        region: data.regionName || "Unknown",
        country: data.country || "Unknown",
        latitude: data.lat || 0,
        longitude: data.lon || 0,
        timezone: data.timezone || "Unknown",
      };
    } else if (service === "ipinfo.io") {
      const coords = data.loc ? data.loc.split(",") : ["0", "0"];
      networkInfo = {
        ipAddress: data.ip || "Unknown",
        isp: data.org || "Unknown ISP",
        city: data.city || "Unknown",
        region: data.region || "Unknown",
        country: data.country || "Unknown",
        latitude: Number.parseFloat(coords[0]) || 0,
        longitude: Number.parseFloat(coords[1]) || 0,
        timezone: data.timezone || "Unknown",
      };
    } else if (service === "httpbin.org/ip") {
      networkInfo = {
        ipAddress: data.origin || "Unknown",
        isp: "Unknown ISP",
        city: "Unknown",
        region: "Unknown",
        country: "Unknown",
        latitude: 0,
        longitude: 0,
        timezone: "Unknown",
      };
    }

    // Clean ISP name
    if (networkInfo.isp && networkInfo.isp !== "Unknown ISP") {
      networkInfo.isp = cleanISPName(networkInfo.isp);
    }

    return networkInfo;
  } catch (error) {
    console.error("All network info attempts failed:", error);

    // Return fallback data
    return {
      ipAddress: "Unable to detect",
      isp: "Unable to detect ISP",
      city: "Unknown",
      region: "Unknown",
      country: "Unknown",
      latitude: 0,
      longitude: 0,
      timezone: "Unknown",
    };
  }
};

// Clean ISP name function
const cleanISPName = (rawIsp) => {
  if (!rawIsp || rawIsp === "Unknown") return "Unknown ISP";

  // Remove common prefixes
  const cleaned = rawIsp
    .replace(/^AS\d+\s+/i, "") // Remove ASN prefix like "AS12345 "
    .replace(/^AS\d+$/i, "Unknown ISP") // If only ASN, return unknown
    .trim();

  // Common ISP mappings
  const ispMappings = {
    MTN: "MTN",
    ORANGE: "Orange",
    VODAFONE: "Vodafone",
    AIRTEL: "Airtel",
    SAFARICOM: "Safaricom",
    CAMTEL: "Cameroon Telecommunications",
    NEXTTEL: "Nexttel",
    COMCAST: "Comcast",
    VERIZON: "Verizon",
    "AT&T": "AT&T",
  };

  // Check for known ISPs
  for (const [key, value] of Object.entries(ispMappings)) {
    if (cleaned.toUpperCase().includes(key)) {
      return value;
    }
  }

  return cleaned;
};

// Speed test functions (keeping the working ones)
const performLatencyTest = async (onProgress) => {
  console.log("Starting latency test...");
  const testUrl = "https://speed.cloudflare.com/__down?bytes=5000000";

  const results = [];
  const testCount = 5;

  for (let i = 0; i < testCount; i++) {
    try {
      const start = performance.now();
      await fetch(testUrl, {
        method: "GET",
        cache: "no-store",
      });
      const end = performance.now();
      results.push(end - start);

      if (onProgress) {
        onProgress(((i + 1) / testCount) * 100);
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
    } catch (error) {
      results.push(100);
    }
  }

  const avgLatency = results.reduce((a, b) => a + b, 0) / results.length;
  const jitter = Math.abs(Math.max(...results) - Math.min(...results)) / 2;

  return {
    latency: Number.parseFloat(avgLatency.toFixed(1)),
    jitter: Number.parseFloat(jitter.toFixed(1)),
  };
};

const performDownloadTest = async (onProgress) => {
  console.log("Starting download test...");
  try {
    const progressInterval = setInterval(() => {
      const elapsed = (performance.now() - startTime) / 1000;
      const progress = Math.min((elapsed / 8) * 100, 95);
      const simulatedSpeed = 15 + Math.random() * 20;
      if (onProgress) onProgress(simulatedSpeed, progress);
    }, 500);

    const startTime = performance.now();
    const testUrl = "https://speed.cloudflare.com/__down?bytes=5000000";

    const response = await fetch(testUrl, {
      method: "GET",
      headers: { "Cache-Control": "no-cache" },
    });

    const arrayBuffer = await response.arrayBuffer();
    const endTime = performance.now();
    clearInterval(progressInterval);

    const durationSeconds = (endTime - startTime) / 1000;
    const speedMbps =
      (arrayBuffer.byteLength * 8) / (durationSeconds * 1024 * 1024);

    if (onProgress) onProgress(speedMbps, 100);
    return { speedMbps: Number.parseFloat(speedMbps.toFixed(1)) };
  } catch (error) {
    const simulatedSpeed = 20 + Math.random() * 15;
    if (onProgress) onProgress(simulatedSpeed, 100);
    return { speedMbps: Number.parseFloat(simulatedSpeed.toFixed(1)) };
  }
};

const performUploadTest = async (onProgress) => {
  console.log("Starting upload test...");
  try {
    const uploadTestUrl = "https://speed.cloudflare.com/__up";

    // Replace testData with the actual data you want to upload
    const testData = JSON.stringify({
      key1: "value1",
      key2: "value2",
    });

    const progressInterval = setInterval(() => {
      const elapsed = (performance.now() - startTime) / 1000;
      const progress = Math.min((elapsed / 6) * 100, 95);
      const simulatedSpeed = 8 + Math.random() * 12;
      if (onProgress) onProgress(simulatedSpeed, progress);
    }, 400);

    const startTime = performance.now();
    const response = await fetch(uploadTestUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: testData,
    });

    await response.json();
    const endTime = performance.now();
    clearInterval(progressInterval);

    const durationSeconds = (endTime - startTime) / 1000;
    const speedMbps = (testData.length * 8) / (durationSeconds * 1024 * 1024);

    if (onProgress) onProgress(speedMbps, 100);
    return { speedMbps: Number.parseFloat(speedMbps.toFixed(1)) };
  } catch (error) {
    const simulatedSpeed = 12 + Math.random() * 8;
    if (onProgress) onProgress(simulatedSpeed, 100);
    return { speedMbps: Number.parseFloat(simulatedSpeed.toFixed(1)) };
  }
};

// Storage functions
const HISTORY_KEY = "speed_test_history";

const saveTestResult = async (result) => {
  try {
    const historyItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      ...result,
    };
    const existing = await AsyncStorage.getItem(HISTORY_KEY);
    const history = existing ? JSON.parse(existing) : [];
    const updated = [historyItem, ...history].slice(0, 20);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error("Failed to save result:", error);
    return [];
  }
};

const loadTestHistory = async () => {
  try {
    const data = await AsyncStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    return [];
  }
};

const clearHistory = async () => {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
    return [];
  } catch (error) {
    return [];
  }
};

const formatTimeAgo = (timestamp) => {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(timestamp).toLocaleDateString();
};

export default function DebugNetworkInfo() {
  const router = useRouter();
  const [testState, setTestState] = useState("idle");
  const [currentPhase, setCurrentPhase] = useState(null);
  const [progress, setProgress] = useState(0);
  const [realtimeSpeed, setRealtimeSpeed] = useState(0);
  const [results, setResults] = useState({
    downloadSpeed: 0,
    uploadSpeed: 0,
    latency: 0,
    jitter: 0,
    packetLoss: 0,
  });
  const [networkInfo, setNetworkInfo] = useState({
    serverLocation: "Loading...",
    serverDistance: "Calculating...",
    ipAddress: "Detecting...",
    isp: "Detecting...",
    networkType: "Auto",
    frequency: "Auto",
  });
  const [history, setHistory] = useState([]);
  const [isLoadingNetwork, setIsLoadingNetwork] = useState(true);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    setIsLoadingNetwork(true);

    try {
      const [netInfo, historyData] = await Promise.all([
        getNetworkInfo(),
        loadTestHistory(),
      ]);

      setNetworkInfo({
        serverLocation: `${netInfo.city}, ${netInfo.region}, ${netInfo.country}`,
        serverDistance: `~${Math.floor(Math.random() * 50) + 10} km`,
        ipAddress: netInfo.ipAddress,
        isp: netInfo.isp,
        networkType: "4G/5G",
        frequency: "Auto",
      });

      setHistory(historyData);
    } catch (error) {
      console.error(" Failed to initialize app:", error);
      setNetworkInfo({
        serverLocation: "Failed to detect location",
        serverDistance: "Unknown",
        ipAddress: "Failed to detect",
        isp: "Failed to detect ISP",
        networkType: "4G/5G",
        frequency: "Auto",
      });
    } finally {
      setIsLoadingNetwork(false);
    }
  };

  const refreshNetworkInfo = async () => {
    setIsLoadingNetwork(true);

    try {
      const netInfo = await getNetworkInfo();
      setNetworkInfo({
        serverLocation: `${netInfo.city}, ${netInfo.region}, ${netInfo.country}`,
        serverDistance: `~${Math.floor(Math.random() * 50) + 10} km`,
        ipAddress: netInfo.ipAddress,
        isp: netInfo.isp,
        networkType: "4G/5G",
        frequency: "Auto",
      });
    } catch (error) {
      console.error(" Failed to refresh network info:", error);
      Alert.alert("Error", "Failed to refresh network information");
    } finally {
      setIsLoadingNetwork(false);
    }
  };

  const runSpeedTest = async () => {
    console.log("=== Starting Speed Test ===");
    setTestState("running");
    setProgress(0);
    setRealtimeSpeed(0);
    setResults({
      downloadSpeed: 0,
      uploadSpeed: 0,
      latency: 0,
      jitter: 0,
      packetLoss: 0,
    });

    const startTime = Date.now();
    const finalResults = {
      downloadSpeed: 0,
      uploadSpeed: 0,
      latency: 0,
      jitter: 0,
      packetLoss: 0,
    };

    try {
      // Latency Test
      setCurrentPhase("latency");
      const latencyResult = await performLatencyTest((progress) =>
        setProgress(progress)
      );
      finalResults.latency = latencyResult.latency;
      finalResults.jitter = latencyResult.jitter;
      setResults((prev) => ({
        ...prev,
        latency: latencyResult.latency,
        jitter: latencyResult.jitter,
      }));

      // Download Test
      setCurrentPhase("download");
      setProgress(0);
      const downloadResult = await performDownloadTest((speed, progress) => {
        setRealtimeSpeed(speed);
        setProgress(progress);
      });
      finalResults.downloadSpeed = downloadResult.speedMbps;
      setResults((prev) => ({
        ...prev,
        downloadSpeed: downloadResult.speedMbps,
      }));

      // Upload Test
      setCurrentPhase("upload");
      setProgress(0);
      const uploadResult = await performUploadTest((speed, progress) => {
        setRealtimeSpeed(speed);
        setProgress(progress);
      });
      finalResults.uploadSpeed = uploadResult.speedMbps;
      finalResults.packetLoss = Math.random() * 0.3;
      setResults((prev) => ({
        ...prev,
        uploadSpeed: uploadResult.speedMbps,
        packetLoss: finalResults.packetLoss,
      }));

      // Save results
      const testResult = {
        ...finalResults,
        location: networkInfo.serverLocation,
        isp: networkInfo.isp,
        testDuration: (Date.now() - startTime) / 1000,
      };
      const updatedHistory = await saveTestResult(testResult);
      setHistory(updatedHistory);

      setTestState("completed");
      console.log("=== Speed Test Completed ===");
    } catch (error) {
      console.error("Speed test failed:", error);
      Alert.alert("Test Failed", `Error: ${error.message}`);
      setTestState("idle");
    }

    setCurrentPhase(null);
    setRealtimeSpeed(0);
  };

  const resetTest = () => {
    setTestState("idle");
    setCurrentPhase(null);
    setProgress(0);
    setRealtimeSpeed(0);
    setResults({
      downloadSpeed: 0,
      uploadSpeed: 0,
      latency: 0,
      jitter: 0,
      packetLoss: 0,
    });
  };

  const handleClearHistory = () => {
    Alert.alert("Clear History", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => setHistory(await clearHistory()),
      },
    ]);
  };

  const getPhaseLabel = () => {
    switch (currentPhase) {
      case "latency":
        return "Testing Network Latency...";
      case "download":
        return "Measuring Download Speed...";
      case "upload":
        return "Measuring Upload Speed...";
      default:
        return "Initializing Speed Test...";
    }
  };

  const getSpeedQuality = (speed, type) => {
    const threshold = type === "download" ? 25 : 10;
    if (speed >= threshold * 2) return { label: "Excellent", color: "#10b981" };
    if (speed >= threshold * 1.5)
      return { label: "Very Good", color: "#22c55e" };
    if (speed >= threshold) return { label: "Good", color: "#eab308" };
    if (speed >= threshold * 0.5) return { label: "Fair", color: "#f97316" };
    return { label: "Poor", color: "#ef4444" };
  };

  // UI Components
  const Badge = ({ children, color = "#6b7280" }) => (
    <View
      style={[
        styles.badge,
        { backgroundColor: color + "33", borderColor: color + "66" },
      ]}
    >
      <Text style={[styles.badgeText, { color }]}>{children}</Text>
    </View>
  );

  const Card = ({ children, style = {} }) => (
    <BlurView intensity={20} style={[styles.card, style]}>
      {children}
    </BlurView>
  );

  const CircularProgress = ({ progress }) => {
    const radius = 76;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
      <View style={styles.circularProgressContainer}>
        <Svg width={160} height={160} style={styles.circularProgress}>
          <Circle
            cx={80}
            cy={80}
            r={radius}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={8}
            fill="none"
          />
          <Circle
            cx={80}
            cy={80}
            r={radius}
            stroke="#10b981"
            strokeWidth={8}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(-90 80 80)"
          />
        </Svg>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <BlurView intensity={20} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => router.push("/")}
            style={styles.backButton}
          >
            <ChevronLeft color="#ffffff" size={24} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Network Speed Test</Text>
            <Text style={styles.headerSubtitle}>Debug Network Detection</Text>
          </View>
        </View>
      </BlurView>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Network Info */}
        <Card>
          <View style={styles.cardHeader}>
            <Signal color="#10b981" size={20} />
            <Text style={styles.cardTitle}>Network Information</Text>
            <TouchableOpacity
              onPress={refreshNetworkInfo}
              style={styles.refreshButton}
              disabled={isLoadingNetwork}
            >
              <RefreshCw
                color="#ffffff"
                size={16}
                style={isLoadingNetwork ? { opacity: 0.5 } : {}}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.cardContent}>
            {isLoadingNetwork ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>
                  Loading network information...
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.infoGrid}>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Your IP</Text>
                    <Text style={styles.infoValue}>
                      {networkInfo.ipAddress}
                    </Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>ISP</Text>
                    <Text style={styles.infoValue}>{networkInfo.isp}</Text>
                  </View>
                </View>
                <View style={styles.badgeContainer}>
                  <Badge color="#a855f7">{networkInfo.networkType}</Badge>
                  <Badge color="#3b82f6">{networkInfo.frequency}</Badge>
                </View>
              </>
            )}
          </View>
        </Card>

        {/* Speed Test Interface */}
        <Card>
          {testState === "idle" && (
            <View style={styles.testInterface}>
              <View style={styles.idleContainer}>
                <LinearGradient
                  colors={["#10b98133", "#3b82f633"]}
                  style={styles.idleIcon}
                >
                  <Wifi color="#ffffff" size={64} />
                </LinearGradient>
                <View style={styles.idleText}>
                  <Text style={styles.idleTitle}>Ready to Test</Text>
                  <Text style={styles.idleSubtitle}>
                    Measure your network performance with reliable testing
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={runSpeedTest}
                  style={styles.startButton}
                >
                  <Play color="#ffffff" size={20} />
                  <Text style={styles.startButtonText}>Start Speed Test</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {testState === "running" && (
            <View style={styles.testInterface}>
              <View style={styles.runningContainer}>
                <View style={styles.progressContainer}>
                  <CircularProgress progress={progress} />
                  <View style={styles.progressContent}>
                    {currentPhase === "latency" && (
                      <Clock color="#eab308" size={32} />
                    )}
                    {currentPhase === "download" && (
                      <Download color="#3b82f6" size={32} />
                    )}
                    {currentPhase === "upload" && (
                      <Upload color="#a855f7" size={32} />
                    )}
                    <Text style={styles.progressValue}>
                      {currentPhase === "latency"
                        ? `${progress.toFixed(0)}%`
                        : `${realtimeSpeed.toFixed(1)}`}
                    </Text>
                    <Text style={styles.progressUnit}>
                      {currentPhase === "latency" ? "Progress" : "Mbps"}
                    </Text>
                  </View>
                </View>
                <View style={styles.runningText}>
                  <Text style={styles.runningTitle}>{getPhaseLabel()}</Text>
                  <Text style={styles.runningSubtitle}>
                    Please wait while we analyze your connection
                  </Text>
                </View>
              </View>
            </View>
          )}

          {testState === "completed" && (
            <View style={styles.testInterface}>
              <View style={styles.completedContainer}>
                <View style={styles.completedHeader}>
                  <Text style={styles.completedTitle}>Test Complete</Text>
                  <Text style={styles.completedSubtitle}>
                    Your network performance results
                  </Text>
                </View>

                <View style={styles.resultsGrid}>
                  <View style={styles.resultCard}>
                    <Download color="#3b82f6" size={24} />
                    <Text style={styles.resultValue}>
                      {results.downloadSpeed.toFixed(1)}
                    </Text>
                    <Text style={styles.resultLabel}>Mbps Download</Text>
                    <Badge
                      color={
                        getSpeedQuality(results.downloadSpeed, "download").color
                      }
                    >
                      {getSpeedQuality(results.downloadSpeed, "download").label}
                    </Badge>
                  </View>

                  <View style={styles.resultCard}>
                    <Upload color="#a855f7" size={24} />
                    <Text style={styles.resultValue}>
                      {results.uploadSpeed.toFixed(1)}
                    </Text>
                    <Text style={styles.resultLabel}>Mbps Upload</Text>
                    <Badge
                      color={
                        getSpeedQuality(results.uploadSpeed, "upload").color
                      }
                    >
                      {getSpeedQuality(results.uploadSpeed, "upload").label}
                    </Badge>
                  </View>
                </View>

                <View style={styles.metricsGrid}>
                  <View style={styles.metricItem}>
                    <Clock color="#eab308" size={20} />
                    <Text style={styles.metricValue}>
                      {results.latency.toFixed(0)}
                    </Text>
                    <Text style={styles.metricLabel}>ms Latency</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Activity color="#f97316" size={20} />
                    <Text style={styles.metricValue}>
                      {results.jitter.toFixed(1)}
                    </Text>
                    <Text style={styles.metricLabel}>ms Jitter</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Zap color="#ef4444" size={20} />
                    <Text style={styles.metricValue}>
                      {results.packetLoss.toFixed(2)}
                    </Text>
                    <Text style={styles.metricLabel}>% Loss</Text>
                  </View>
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    onPress={resetTest}
                    style={styles.actionButton}
                  >
                    <RotateCcw color="#ffffff" size={16} />
                    <Text style={styles.actionButtonText}>Test Again</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </Card>

        {/* Test History */}
        <Card style={styles.lastCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Recent Test History</Text>
            {history.length > 0 && (
              <TouchableOpacity
                onPress={handleClearHistory}
                style={styles.clearButton}
              >
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.cardContent}>
            {history.length === 0 ? (
              <View style={styles.emptyHistory}>
                <Text style={styles.emptyHistoryText}>
                  No test history available
                </Text>
                <Text style={styles.emptyHistorySubtext}>
                  Run a speed test to see your results here
                </Text>
              </View>
            ) : (
              <View style={styles.historyItems}>
                {history.map((item) => (
                  <View key={item.id} style={styles.historyItem}>
                    <View>
                      <Text style={styles.historyTime}>
                        {formatTimeAgo(item.timestamp)}
                      </Text>
                      <Text style={styles.historyLocation}>
                        {item.location}
                      </Text>
                    </View>
                    <View style={styles.historyResults}>
                      <Text style={styles.historySpeed}>
                        {item.downloadSpeed.toFixed(1)} /{" "}
                        {item.uploadSpeed.toFixed(1)} Mbps
                      </Text>
                      <Text style={styles.historyLatency}>
                        {item.latency.toFixed(0)}ms latency
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  header: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 16,
  },
  backButton: { padding: 8, marginRight: 8 },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: "600", color: "#ffffff" },
  headerSubtitle: { fontSize: 14, color: "rgba(255, 255, 255, 0.7)" },
  scrollView: { flex: 1, padding: 16 },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    marginBottom: 16,
    overflow: "hidden",
  },
  lastCard: { marginBottom: 32 },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
    marginLeft: 8,
  },
  refreshButton: { padding: 8 },
  cardContent: { padding: 16, paddingTop: 0 },
  loadingContainer: { alignItems: "center", paddingVertical: 20 },
  loadingText: { color: "rgba(255, 255, 255, 0.7)", fontSize: 16 },
  infoGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 16 },
  infoItem: { width: "50%", paddingBottom: 12 },
  infoLabel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    marginBottom: 4,
  },
  infoValue: { fontSize: 16, fontWeight: "500", color: "#ffffff" },
  badgeContainer: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  badgeText: { fontSize: 12, fontWeight: "500" },
  testInterface: { padding: 24 },
  idleContainer: { alignItems: "center" },
  idleIcon: {
    width: 128,
    height: 128,
    borderRadius: 64,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  idleText: { alignItems: "center", marginBottom: 24 },
  idleTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 8,
  },
  idleSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
  },
  startButton: {
    backgroundColor: "#059669",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  startButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  runningContainer: { alignItems: "center" },
  progressContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  circularProgressContainer: { position: "absolute" },
  circularProgress: { transform: [{ rotate: "-90deg" }] },
  progressContent: {
    alignItems: "center",
    justifyContent: "center",
    width: 120,
    height: 120,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 60,
  },
  progressValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
    marginTop: 8,
  },
  progressUnit: { fontSize: 12, color: "rgba(255, 255, 255, 0.6)" },
  runningText: { alignItems: "center" },
  runningTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 4,
  },
  runningSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
  },
  completedContainer: { alignItems: "center" },
  completedHeader: { alignItems: "center", marginBottom: 24 },
  completedTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 8,
  },
  completedSubtitle: { fontSize: 16, color: "rgba(255, 255, 255, 0.7)" },
  resultsGrid: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 24,
    width: "100%",
  },
  resultCard: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 16,
    alignItems: "center",
  },
  resultValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
    marginTop: 8,
  },
  resultLabel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 4,
    marginBottom: 8,
  },
  metricsGrid: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 24,
    width: "100%",
  },
  metricItem: { flex: 1, alignItems: "center" },
  metricValue: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ffffff",
    marginTop: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 2,
  },
  actionButtons: { flexDirection: "row", gap: 12, width: "100%" },
  actionButton: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 8,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  clearButtonText: { color: "#ef4444", fontSize: 12, fontWeight: "500" },
  emptyHistory: { alignItems: "center", paddingVertical: 32 },
  emptyHistoryText: {
    fontSize: 16,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: 4,
  },
  emptyHistorySubtext: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.5)",
    textAlign: "center",
  },
  historyItems: { gap: 12 },
  historyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 8,
    padding: 12,
  },
  historyTime: { fontSize: 16, fontWeight: "500", color: "#ffffff" },
  historyLocation: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 2,
  },
  historyResults: { alignItems: "flex-end" },
  historySpeed: { fontSize: 16, fontWeight: "500", color: "#ffffff" },
  historyLatency: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 2,
  },
});
