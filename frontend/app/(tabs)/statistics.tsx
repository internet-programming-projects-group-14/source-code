import { QoEAnalyticsResponse } from "@/lib/types";
import Constants from "expo-constants";
import {
  BarChart3,
  ChevronLeft,
  Clock,
  RefreshCw,
  Signal,
  TrendingDown,
  TrendingUp,
  Wifi,
  Zap,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as SecureStore from "expo-secure-store";

const { width } = Dimensions.get("window");

if (!Constants.expoConfig?.extra?.API_URL) {
  console.error("API_URL is not defined in app.config.js!");
}

// const apiUrl = Constants.expoConfig.extra.API_URL;

type MetricType = "qoe" | "speed" | "latency" | "signal";

export default function StatisticsPage({ onBack }: { onBack: () => void }) {
  const [selectedPeriod, setSelectedPeriod] = useState("24H");
  const [selectedMetric, setSelectedMetric] = useState<MetricType>("qoe");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [animatedValues] = useState(() =>
    Array.from({ length: 7 }, () => new Animated.Value(0))
  );
  const [currentData, setCurrentData] = useState<
    QoEAnalyticsResponse | undefined
  >(undefined);

  const periods = [
    { value: "24H", label: "24H" },
    { value: "7D", label: "7D" },
    { value: "30D", label: "30D" },
  ];

  const metrics = [
    { value: "qoe", label: "QoE Score", icon: BarChart3, color: "#60a5fa" },
    { value: "speed", label: "Throughput", icon: Zap, color: "#a78bfa" },
    { value: "signal", label: "RF Quality", icon: Signal, color: "#34d399" },
    { value: "latency", label: "Latency", icon: Clock, color: "#f59e0b" },
  ];

  // Could stillmake names homogeneouss
  const metricEndpoints = {
    qoe: "qoe",
    speed: "throughput",
    signal: "rf-quality",
    latency: "latency",
  };

  // Reusable function to fetch analytics data
  const fetchAnalyticsData = async (userId = null) => {
    try {
      setLoading(true);
      setError("");
      const TOKEN_KEY = "user_unique_id";
      let userId = await SecureStore.getItemAsync(TOKEN_KEY);

      // Validate metric type
      if (!metricEndpoints[selectedMetric]) {
        throw new Error(`Invalid metric type: ${selectedMetric}`);
      }

      // Build URL with parameters
      const endpoint = metricEndpoints[selectedMetric];
      let url = `https://qoe.onrender.com/api/analytics/${endpoint}?period=${selectedPeriod}&userId=${userId}`;
      console.log("URL", url);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const json = await response.json();

      setCurrentData(json);
    } catch (err) {
      let errorMessage = "Something went wrong";
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Animation for bars
  const animateBars = () => {
    animatedValues.forEach((value, index) => {
      value.setValue(0);
      Animated.timing(value, {
        toValue: 1,
        duration: 800,
        delay: index * 100,
        useNativeDriver: false,
      }).start();
    });
  };

  useEffect(() => {
    fetchAnalyticsData();
    animateBars();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMetric, selectedPeriod]);

  // Refresh data simulation
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    fetchAnalyticsData();

    animateBars();
    setIsRefreshing(false);
  };

  const getBarHeight = (value: number, maxValue: number) => {
    if ((value && maxValue === 0) || maxValue === 0) {
      return 0;
    } else {
      return (value / maxValue) * 100;
    }
  };

  const currentMetric = metrics.find((m) => m.value === selectedMetric);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <ChevronLeft color="white" size={24} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Network Analytics</Text>
            <Text style={styles.headerSubtitle}>
              Real-time performance insights
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={handleRefresh}
          style={[styles.refreshButton, isRefreshing && styles.refreshing]}
          disabled={isRefreshing}
        >
          <RefreshCw
            color="white"
            size={20}
            style={[isRefreshing && { transform: [{ rotate: "360deg" }] }]}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Period Selection */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Time Period</Text>
          <View style={styles.periodButtonsContainer}>
            {periods.map((period) => (
              <TouchableOpacity
                key={period.value}
                style={[
                  styles.periodButton,
                  selectedPeriod === period.value && styles.periodButtonActive,
                ]}
                onPress={() => setSelectedPeriod(period.value)}
              >
                <Text
                  style={[
                    styles.periodButtonText,
                    selectedPeriod === period.value &&
                      styles.periodButtonTextActive,
                  ]}
                >
                  {period.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {loading || !currentData?.data ? (
          <>
            <View style={styles.center}>
              <ActivityIndicator size="large" />
              <Text style={styles.loadingText}>Loading QoE data...</Text>
            </View>
          </>
        ) : (
          <>
            {/* Key Performance Indicators */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Performance Overview</Text>
              <View style={styles.kpiContainer}>
                <View style={styles.kpiCard}>
                  <View style={styles.kpiHeader}>
                    <View
                      style={[
                        styles.kpiIcon,
                        { backgroundColor: currentMetric?.color + "20" },
                      ]}
                    >
                      {currentMetric &&
                        React.createElement(currentMetric.icon, {
                          color: currentMetric.color,
                          size: 20,
                        })}
                    </View>
                    <Text style={styles.kpiLabel}>
                      Average {currentMetric?.label}
                    </Text>
                  </View>
                  <View style={styles.kpiValueContainer}>
                    <Text style={styles.kpiValue}>
                      {currentData?.data.performanceOverview.averageQoEScore}
                      {selectedMetric === "speed" && (
                        <Text style={styles.kpiUnit}> Mbps</Text>
                      )}
                      {selectedMetric === "signal" && (
                        <Text style={styles.kpiUnit}> dBm</Text>
                      )}
                      {selectedMetric === "latency" && (
                        <Text style={styles.kpiUnit}> ms</Text>
                      )}
                    </Text>

                    <View style={styles.trendContainer}>
                      {currentData?.data.performanceOverview.percentageChange >=
                      0 ? (
                        <TrendingUp color="#34d399" size={16} />
                      ) : (
                        <TrendingDown color="#f87171" size={16} />
                      )}
                      <Text
                        style={[
                          styles.trendText,
                          {
                            color:
                              currentData?.data.performanceOverview
                                .percentageChange >= 0
                                ? "#34d399"
                                : "#f87171",
                          },
                        ]}
                      >
                        {currentData?.data.performanceOverview
                          .percentageChange >= 0
                          ? "+"
                          : ""}
                        {currentData?.data.performanceOverview.percentageChange}
                        %
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.kpiCard}>
                  <View style={styles.kpiHeader}>
                    <View
                      style={[styles.kpiIcon, { backgroundColor: "#10b98120" }]}
                    >
                      <Wifi color="#10b981" size={20} />
                    </View>
                    <Text style={styles.kpiLabel}>Data Points</Text>
                  </View>
                  <View style={styles.kpiValueContainer}>
                    <Text style={styles.kpiValue}>
                      {currentData?.data.performanceOverview.dataPoints}
                    </Text>
                    <Text style={styles.kpiSubtext}> measurements</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Metric Selection */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Select Metric</Text>
              <View style={styles.metricButtonsContainer}>
                {metrics.map((metric) => {
                  const Icon = metric.icon;
                  const isActive = selectedMetric === metric.value;
                  return (
                    <TouchableOpacity
                      key={metric.value}
                      style={[
                        styles.metricButton,
                        isActive && [
                          styles.metricButtonActive,
                          { borderColor: metric.color },
                        ],
                      ]}
                      onPress={() =>
                        setSelectedMetric(metric.value as MetricType)
                      }
                    >
                      <View
                        style={[
                          styles.metricIconContainer,
                          {
                            backgroundColor: isActive
                              ? metric.color
                              : metric.color + "20",
                          },
                        ]}
                      >
                        <Icon
                          color={isActive ? "white" : metric.color}
                          size={18}
                        />
                      </View>
                      <Text
                        style={[
                          styles.metricButtonText,
                          isActive && styles.metricButtonTextActive,
                        ]}
                      >
                        {metric.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Performance Chart */}
            <View style={styles.sectionContainer}>
              <View style={styles.chartHeader}>
                <Text style={styles.chartTitle}>
                  {selectedMetric === "qoe"
                    ? "Quality of Experience Trends"
                    : selectedMetric === "speed"
                    ? "Network Throughput Analysis"
                    : selectedMetric === "signal"
                    ? "RF Signal Quality"
                    : "Network Latency Metrics"}
                </Text>
                <View style={styles.chartStats}>
                  <Text style={styles.chartStat}>
                    Max:{" "}
                    <Text style={styles.chartStatValue}>
                      {currentData?.data.trends.max}
                    </Text>
                  </Text>
                  <Text style={styles.chartStat}>
                    Min:{" "}
                    <Text style={styles.chartStatValue}>
                      {currentData?.data.trends.min}
                    </Text>
                  </Text>
                </View>
              </View>

              <View style={styles.chartContainer}>
                <View style={styles.barChartContainer}>
                  {currentData?.data.trends.data
                    .slice(0, 7)
                    .map((item, index) => {
                      const maxVal = currentData.data.trends.max;
                      const height = getBarHeight(item.value, maxVal);

                      return (
                        <View key={index} style={styles.barChartColumn}>
                          <View style={styles.barChartBackground}>
                            <Animated.View
                              style={[
                                styles.barChartBar,
                                {
                                  height: animatedValues[index].interpolate({
                                    inputRange: [0, 1],
                                    outputRange: ["0%", `${height}%`],
                                  }),
                                  backgroundColor:
                                    currentMetric?.color || "#60a5fa",
                                },
                              ]}
                            />
                            {selectedMetric === "speed" && (
                              <Animated.View
                                style={[
                                  styles.barChartBar,
                                  {
                                    height: animatedValues[index].interpolate({
                                      inputRange: [0, 1],
                                      outputRange: [
                                        "0%",
                                        `${getBarHeight(item.value, maxVal)}%`,
                                      ],
                                    }),
                                    backgroundColor: "#8b5cf6",
                                    opacity: 0.7,
                                  },
                                ]}
                              />
                            )}
                          </View>
                          <Text style={styles.barChartLabel}>{item.time}</Text>
                          <Text style={styles.barChartValue}>
                            {selectedMetric === "speed"
                              ? item.value.toFixed(1)
                              : item.value.toFixed(1)}
                          </Text>
                        </View>
                      );
                    })}
                </View>

                {selectedMetric === "speed" && (
                  <View style={styles.chartLegend}>
                    <View style={styles.legendItem}>
                      <View
                        style={[
                          styles.legendColor,
                          { backgroundColor: currentMetric?.color },
                        ]}
                      />
                      <Text style={styles.legendText}>Download</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View
                        style={[
                          styles.legendColor,
                          { backgroundColor: "#8b5cf6" },
                        ]}
                      />
                      <Text style={styles.legendText}>Upload</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* Performance Summary */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Performance Summary</Text>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryCard}>
                  <View style={styles.summaryHeader}>
                    <TrendingUp color="#34d399" size={16} />
                    <Text style={styles.summaryLabel}>Peak Performance</Text>
                  </View>
                  <Text style={styles.summaryValuePositive}>
                    {currentData?.data.performanceSummary.peakPerformance}
                    {selectedMetric === "speed"
                      ? " Mbps"
                      : selectedMetric === "signal"
                      ? " dBm"
                      : selectedMetric === "latency"
                      ? " ms"
                      : "/5"}
                  </Text>
                </View>

                <View style={styles.summaryCard}>
                  <View style={styles.summaryHeader}>
                    <TrendingDown color="#f87171" size={16} />
                    <Text style={styles.summaryLabel}>Lowest Performance</Text>
                  </View>
                  <Text style={styles.summaryValueNegative}>
                    {currentData?.data.performanceSummary.lowestPerformance}
                    {selectedMetric === "speed"
                      ? " Mbps"
                      : selectedMetric === "signal"
                      ? " dBm"
                      : selectedMetric === "latency"
                      ? " ms"
                      : "/5"}
                  </Text>
                </View>

                <View style={styles.summaryCard}>
                  <View style={styles.summaryHeader}>
                    <BarChart3 color="#60a5fa" size={16} />
                    <Text style={styles.summaryLabel}>Variance</Text>
                  </View>
                  <Text style={styles.summaryValue}>
                    {currentData?.data.performanceSummary.variance} range
                  </Text>
                </View>
                <View style={styles.summaryCard}>
                  <View style={styles.summaryHeader}>
                    {currentData?.data.performanceSummary.trend >= 0 ? (
                      <TrendingUp color="#34d399" size={16} />
                    ) : (
                      <TrendingDown color="#f87171" size={16} />
                    )}
                    <Text style={styles.summaryLabel}>Trend</Text>
                  </View>
                  <Text
                    style={[
                      styles.summaryValue,
                      {
                        color:
                          currentData?.data.performanceSummary.trend >= 0
                            ? "#34d399"
                            : "#f87171",
                      },
                    ]}
                  >
                    {currentData?.data.performanceSummary.trend >= 0 ? "+" : ""}
                    {currentData?.data.performanceSummary.trend}% change
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
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
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 14,
    marginTop: 2,
  },
  refreshButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  refreshing: {
    opacity: 0.6,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "white",
  },

  errorText: {
    color: "red",
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionContainer: {
    marginTop: 24,
  },
  sectionTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  periodButtonsContainer: {
    flexDirection: "row",
    gap: 12,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
  },
  periodButtonActive: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  periodButtonText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    fontWeight: "500",
  },
  periodButtonTextActive: {
    color: "white",
    fontWeight: "600",
  },
  kpiContainer: {
    flexDirection: "row",
    gap: 16,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  kpiHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  kpiIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  kpiLabel: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  kpiValueContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  kpiValue: {
    color: "white",
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  kpiUnit: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    fontWeight: "500",
  },
  kpiSubtext: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 12,
    marginBottom: 4,
  },
  trendContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  trendText: {
    fontSize: 13,
    fontWeight: "600",
  },
  metricButtonsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metricButton: {
    width: (width - 64) / 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  metricButtonActive: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 2,
    shadowColor: "rgba(96, 165, 250, 0.5)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  metricIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  metricButtonText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  metricButtonTextActive: {
    color: "white",
    fontWeight: "600",
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  chartTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
    letterSpacing: -0.3,
  },
  chartStats: {
    alignItems: "flex-end",
  },
  chartStat: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 12,
    marginBottom: 2,
  },
  chartStatValue: {
    color: "white",
    fontWeight: "600",
  },
  chartContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  barChartContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    height: 180,
    marginBottom: 20,
    alignItems: "flex-end",
  },
  barChartColumn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    marginHorizontal: 2,
  },
  barChartBackground: {
    width: "85%",
    height: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 6,
    overflow: "hidden",
    position: "relative",
  },
  barChartBar: {
    width: "100%",
    position: "absolute",
    bottom: 0,
    borderRadius: 6,
  },
  barChartLabel: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 11,
    marginTop: 8,
    fontWeight: "500",
  },
  barChartValue: {
    color: "white",
    fontSize: 10,
    marginTop: 2,
    fontWeight: "600",
  },
  chartLegend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendColor: {
    width: 14,
    height: 14,
    borderRadius: 3,
  },
  legendText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 12,
    fontWeight: "500",
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  summaryCard: {
    width: (width - 64) / 2,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  summaryLabel: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },
  summaryValue: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  summaryValuePositive: {
    color: "#34d399",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  summaryValueNegative: {
    color: "#f87171",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  bottomPadding: {
    height: 40,
  },
});
