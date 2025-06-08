import React, { useState, useEffect } from "react";
<<<<<<< HEAD
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from "react-native";
import {
  ChevronLeft,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Zap,
  Signal,
  Clock,
  RefreshCw,
  Wifi,
} from "lucide-react-native";

const { width } = Dimensions.get("window");
=======
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet,
  Animated,
  Dimensions 
} from "react-native";
import { 
  ChevronLeft, 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Download, 
  Zap, 
  Signal, 
  Clock,
  RefreshCw,
  Wifi
} from "lucide-react-native";

const { width } = Dimensions.get('window');
>>>>>>> ef4e1333a5e331bf72eb9bfd203764fab9ca5f04

export default function StatisticsPage({ onBack }: { onBack: () => void }) {
  const [selectedPeriod, setSelectedPeriod] = useState("7d");
  const [selectedMetric, setSelectedMetric] = useState("qoe");
  const [isRefreshing, setIsRefreshing] = useState(false);
<<<<<<< HEAD
  const [animatedValues] = useState(() =>
=======
  const [animatedValues] = useState(() => 
>>>>>>> ef4e1333a5e331bf72eb9bfd203764fab9ca5f04
    Array.from({ length: 7 }, () => new Animated.Value(0))
  );
  const [currentData, setCurrentData] = useState({});

  const periods = [
    { value: "24h", label: "24H" },
    { value: "7d", label: "7D" },
    { value: "30d", label: "30D" },
    { value: "90d", label: "90D" },
  ];

  const metrics = [
    { value: "qoe", label: "QoE Score", icon: BarChart3, color: "#60a5fa" },
    { value: "speed", label: "Throughput", icon: Zap, color: "#a78bfa" },
    { value: "signal", label: "RF Quality", icon: Signal, color: "#34d399" },
    { value: "latency", label: "Latency", icon: Clock, color: "#f59e0b" },
  ];

  // Dynamic data generation based on period and metric
  const generateData = (period: string, metric: string) => {
<<<<<<< HEAD
    const dataPoints =
      period === "24h" ? 24 : period === "7d" ? 7 : period === "30d" ? 30 : 90;
    const baseValue =
      metric === "qoe"
        ? 4
        : metric === "speed"
        ? 45
        : metric === "signal"
        ? -70
        : 25;
    const variance =
      metric === "qoe"
        ? 1
        : metric === "speed"
        ? 15
        : metric === "signal"
        ? 20
        : 10;

    return Array.from({ length: dataPoints }, (_, i) => {
      const timeLabel =
        period === "24h"
          ? `${i}:00`
          : period === "7d"
          ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i % 7]
          : period === "30d"
          ? `Day ${i + 1}`
          : `Week ${Math.floor(i / 7) + 1}`;

      const value = baseValue + (Math.random() - 0.5) * variance;
      const change = (Math.random() - 0.5) * (variance / 5);

=======
    const dataPoints = period === "24h" ? 24 : period === "7d" ? 7 : period === "30d" ? 30 : 90;
    const baseValue = metric === "qoe" ? 4 : metric === "speed" ? 45 : metric === "signal" ? -70 : 25;
    const variance = metric === "qoe" ? 1 : metric === "speed" ? 15 : metric === "signal" ? 20 : 10;
    
    return Array.from({ length: dataPoints }, (_, i) => {
      const timeLabel = period === "24h" 
        ? `${i}:00` 
        : period === "7d" 
          ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i % 7]
          : period === "30d"
            ? `Day ${i + 1}`
            : `Week ${Math.floor(i / 7) + 1}`;
      
      const value = baseValue + (Math.random() - 0.5) * variance;
      const change = (Math.random() - 0.5) * (variance / 5);
      
>>>>>>> ef4e1333a5e331bf72eb9bfd203764fab9ca5f04
      return {
        time: timeLabel,
        value: parseFloat(value.toFixed(1)),
        change: parseFloat(change.toFixed(1)),
        download: metric === "speed" ? parseFloat(value.toFixed(1)) : 0,
        upload: metric === "speed" ? parseFloat((value * 0.3).toFixed(1)) : 0,
      };
    });
  };

<<<<<<< HEAD
  const [data, setData] = useState(() =>
    generateData(selectedPeriod, selectedMetric)
  );
=======
  const [data, setData] = useState(() => generateData(selectedPeriod, selectedMetric));
>>>>>>> ef4e1333a5e331bf72eb9bfd203764fab9ca5f04

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

  // Refresh data simulation
  const handleRefresh = async () => {
    setIsRefreshing(true);
<<<<<<< HEAD
    await new Promise((resolve) => setTimeout(resolve, 1000));
=======
    await new Promise(resolve => setTimeout(resolve, 1000));
>>>>>>> ef4e1333a5e331bf72eb9bfd203764fab9ca5f04
    const newData = generateData(selectedPeriod, selectedMetric);
    setData(newData);
    animateBars();
    setIsRefreshing(false);
  };

  // Update data when period or metric changes
  useEffect(() => {
    const newData = generateData(selectedPeriod, selectedMetric);
    setData(newData);
    animateBars();
  }, [selectedPeriod, selectedMetric]);

  const getMaxValue = (data: any[], key: string) => {
    return Math.max(...data.map((item) => item[key]));
  };

  const getBarHeight = (value: number, maxValue: number) => {
    return (value / maxValue) * 100;
  };

  const calculateAverage = (data: any[], key: string) => {
    return data.reduce((sum, item) => sum + item[key], 0) / data.length;
  };

  const calculateTrend = (data: any[]) => {
    if (data.length < 2) return 0;
<<<<<<< HEAD
    const recent =
      data.slice(-3).reduce((sum, item) => sum + item.value, 0) / 3;
    const previous =
      data.slice(0, 3).reduce((sum, item) => sum + item.value, 0) / 3;
    return parseFloat((((recent - previous) / previous) * 100).toFixed(1));
  };

  const currentMetric = metrics.find((m) => m.value === selectedMetric);
  const averageValue = calculateAverage(
    data,
    selectedMetric === "speed" ? "download" : "value"
  );
  const trendValue = calculateTrend(data);
  const maxValue = Math.max(
    ...data.map((item) =>
      selectedMetric === "speed" ? item.download : item.value
    )
  );
  const minValue = Math.min(
    ...data.map((item) =>
      selectedMetric === "speed" ? item.download : item.value
    )
  );
=======
    const recent = data.slice(-3).reduce((sum, item) => sum + item.value, 0) / 3;
    const previous = data.slice(0, 3).reduce((sum, item) => sum + item.value, 0) / 3;
    return parseFloat(((recent - previous) / previous * 100).toFixed(1));
  };

  const currentMetric = metrics.find(m => m.value === selectedMetric);
  const averageValue = calculateAverage(data, selectedMetric === "speed" ? "download" : "value");
  const trendValue = calculateTrend(data);
  const maxValue = Math.max(...data.map(item => selectedMetric === "speed" ? item.download : item.value));
  const minValue = Math.min(...data.map(item => selectedMetric === "speed" ? item.download : item.value));
>>>>>>> ef4e1333a5e331bf72eb9bfd203764fab9ca5f04

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
<<<<<<< HEAD
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
=======
            <Text style={styles.headerSubtitle}>Real-time performance insights</Text>
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
            style={[isRefreshing && { transform: [{ rotate: '360deg' }] }]} 
>>>>>>> ef4e1333a5e331bf72eb9bfd203764fab9ca5f04
          />
        </TouchableOpacity>
      </View>

<<<<<<< HEAD
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
=======
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
>>>>>>> ef4e1333a5e331bf72eb9bfd203764fab9ca5f04
        {/* Period Selection */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Time Period</Text>
          <View style={styles.periodButtonsContainer}>
            {periods.map((period) => (
              <TouchableOpacity
                key={period.value}
                style={[
                  styles.periodButton,
<<<<<<< HEAD
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
=======
                  selectedPeriod === period.value && styles.periodButtonActive
                ]}
                onPress={() => setSelectedPeriod(period.value)}
              >
                <Text style={[
                  styles.periodButtonText,
                  selectedPeriod === period.value && styles.periodButtonTextActive
                ]}>
>>>>>>> ef4e1333a5e331bf72eb9bfd203764fab9ca5f04
                  {period.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Key Performance Indicators */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Performance Overview</Text>
          <View style={styles.kpiContainer}>
            <View style={styles.kpiCard}>
              <View style={styles.kpiHeader}>
<<<<<<< HEAD
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
=======
                <View style={[styles.kpiIcon, { backgroundColor: currentMetric?.color + '20' }]}>
                  {currentMetric && React.createElement(currentMetric.icon, { 
                    color: currentMetric.color, 
                    size: 20 
                  })}
                </View>
                <Text style={styles.kpiLabel}>Average {currentMetric?.label}</Text>
>>>>>>> ef4e1333a5e331bf72eb9bfd203764fab9ca5f04
              </View>
              <View style={styles.kpiValueContainer}>
                <Text style={styles.kpiValue}>
                  {averageValue.toFixed(1)}
<<<<<<< HEAD
                  {selectedMetric === "speed" && (
                    <Text style={styles.kpiUnit}> Mbps</Text>
                  )}
                  {selectedMetric === "signal" && (
                    <Text style={styles.kpiUnit}> dBm</Text>
                  )}
                  {selectedMetric === "latency" && (
                    <Text style={styles.kpiUnit}> ms</Text>
                  )}
=======
                  {selectedMetric === "speed" && <Text style={styles.kpiUnit}> Mbps</Text>}
                  {selectedMetric === "signal" && <Text style={styles.kpiUnit}> dBm</Text>}
                  {selectedMetric === "latency" && <Text style={styles.kpiUnit}> ms</Text>}
>>>>>>> ef4e1333a5e331bf72eb9bfd203764fab9ca5f04
                </Text>
                <View style={styles.trendContainer}>
                  {trendValue >= 0 ? (
                    <TrendingUp color="#34d399" size={16} />
                  ) : (
                    <TrendingDown color="#f87171" size={16} />
                  )}
<<<<<<< HEAD
                  <Text
                    style={[
                      styles.trendText,
                      { color: trendValue >= 0 ? "#34d399" : "#f87171" },
                    ]}
                  >
                    {trendValue >= 0 ? "+" : ""}
                    {trendValue}%
=======
                  <Text style={[
                    styles.trendText,
                    { color: trendValue >= 0 ? '#34d399' : '#f87171' }
                  ]}>
                    {trendValue >= 0 ? '+' : ''}{trendValue}%
>>>>>>> ef4e1333a5e331bf72eb9bfd203764fab9ca5f04
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.kpiCard}>
              <View style={styles.kpiHeader}>
<<<<<<< HEAD
                <View
                  style={[styles.kpiIcon, { backgroundColor: "#10b98120" }]}
                >
=======
                <View style={[styles.kpiIcon, { backgroundColor: '#10b98120' }]}>
>>>>>>> ef4e1333a5e331bf72eb9bfd203764fab9ca5f04
                  <Wifi color="#10b981" size={20} />
                </View>
                <Text style={styles.kpiLabel}>Data Points</Text>
              </View>
              <View style={styles.kpiValueContainer}>
                <Text style={styles.kpiValue}>{data.length}</Text>
                <Text style={styles.kpiSubtext}>measurements</Text>
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
<<<<<<< HEAD
                    isActive && [
                      styles.metricButtonActive,
                      { borderColor: metric.color },
                    ],
                  ]}
                  onPress={() => setSelectedMetric(metric.value)}
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
                    <Icon color={isActive ? "white" : metric.color} size={18} />
                  </View>
                  <Text
                    style={[
                      styles.metricButtonText,
                      isActive && styles.metricButtonTextActive,
                    ]}
                  >
=======
                    isActive && [styles.metricButtonActive, { borderColor: metric.color }]
                  ]}
                  onPress={() => setSelectedMetric(metric.value)}
                >
                  <View style={[
                    styles.metricIconContainer,
                    { backgroundColor: isActive ? metric.color : metric.color + '20' }
                  ]}>
                    <Icon 
                      color={isActive ? "white" : metric.color} 
                      size={18} 
                    />
                  </View>
                  <Text style={[
                    styles.metricButtonText,
                    isActive && styles.metricButtonTextActive
                  ]}>
>>>>>>> ef4e1333a5e331bf72eb9bfd203764fab9ca5f04
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
<<<<<<< HEAD
                ? "Network Throughput Analysis"
                : selectedMetric === "signal"
                ? "RF Signal Quality"
                : "Network Latency Metrics"}
            </Text>
            <View style={styles.chartStats}>
              <Text style={styles.chartStat}>
                Max:{" "}
                <Text style={styles.chartStatValue}>{maxValue.toFixed(1)}</Text>
              </Text>
              <Text style={styles.chartStat}>
                Min:{" "}
                <Text style={styles.chartStatValue}>{minValue.toFixed(1)}</Text>
              </Text>
            </View>
          </View>

          <View style={styles.chartContainer}>
            <View style={styles.barChartContainer}>
              {data.slice(0, 7).map((item, index) => {
                const maxVal =
                  selectedMetric === "speed"
                    ? getMaxValue(data, "download")
                    : Math.max(...data.map((d) => d.value));
                const height =
                  selectedMetric === "speed"
                    ? getBarHeight(item.download, maxVal)
                    : getBarHeight(item.value, maxVal);

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
                            backgroundColor: currentMetric?.color || "#60a5fa",
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
                                  `${getBarHeight(item.upload, maxVal)}%`,
                                ],
                              }),
                              backgroundColor: "#8b5cf6",
                              opacity: 0.7,
                            },
=======
                  ? "Network Throughput Analysis"
                  : selectedMetric === "signal"
                    ? "RF Signal Quality"
                    : "Network Latency Metrics"}
            </Text>
            <View style={styles.chartStats}>
              <Text style={styles.chartStat}>
                Max: <Text style={styles.chartStatValue}>{maxValue.toFixed(1)}</Text>
              </Text>
              <Text style={styles.chartStat}>
                Min: <Text style={styles.chartStatValue}>{minValue.toFixed(1)}</Text>
              </Text>
            </View>
          </View>
          
          <View style={styles.chartContainer}>
            <View style={styles.barChartContainer}>
              {data.slice(0, 7).map((item, index) => {
                const maxVal = selectedMetric === "speed" 
                  ? getMaxValue(data, "download") 
                  : Math.max(...data.map(d => d.value));
                const height = selectedMetric === "speed" 
                  ? getBarHeight(item.download, maxVal)
                  : getBarHeight(item.value, maxVal);
                
                return (
                  <View key={index} style={styles.barChartColumn}>
                    <View style={styles.barChartBackground}>
                      <Animated.View 
                        style={[
                          styles.barChartBar,
                          { 
                            height: animatedValues[index].interpolate({
                              inputRange: [0, 1],
                              outputRange: ['0%', `${height}%`]
                            }),
                            backgroundColor: currentMetric?.color || '#60a5fa'
                          }
                        ]}
                      />
                      {selectedMetric === "speed" && (
                        <Animated.View 
                          style={[
                            styles.barChartBar,
                            { 
                              height: animatedValues[index].interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0%', `${getBarHeight(item.upload, maxVal)}%`]
                              }),
                              backgroundColor: '#8b5cf6',
                              opacity: 0.7
                            }
>>>>>>> ef4e1333a5e331bf72eb9bfd203764fab9ca5f04
                          ]}
                        />
                      )}
                    </View>
                    <Text style={styles.barChartLabel}>{item.time}</Text>
                    <Text style={styles.barChartValue}>
<<<<<<< HEAD
                      {selectedMetric === "speed"
                        ? item.download.toFixed(1)
                        : item.value.toFixed(1)}
=======
                      {selectedMetric === "speed" ? item.download.toFixed(1) : item.value.toFixed(1)}
>>>>>>> ef4e1333a5e331bf72eb9bfd203764fab9ca5f04
                    </Text>
                  </View>
                );
              })}
            </View>
<<<<<<< HEAD

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
                    style={[styles.legendColor, { backgroundColor: "#8b5cf6" }]}
                  />
=======
            
            {selectedMetric === "speed" && (
              <View style={styles.chartLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: currentMetric?.color }]} />
                  <Text style={styles.legendText}>Download</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: '#8b5cf6' }]} />
>>>>>>> ef4e1333a5e331bf72eb9bfd203764fab9ca5f04
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
<<<<<<< HEAD
                {maxValue.toFixed(1)}
                {selectedMetric === "speed"
                  ? " Mbps"
                  : selectedMetric === "signal"
                  ? " dBm"
                  : selectedMetric === "latency"
                  ? " ms"
                  : "/5"}
              </Text>
            </View>

=======
                {maxValue.toFixed(1)}{selectedMetric === "speed" ? " Mbps" : selectedMetric === "signal" ? " dBm" : selectedMetric === "latency" ? " ms" : "/5"}
              </Text>
            </View>
            
>>>>>>> ef4e1333a5e331bf72eb9bfd203764fab9ca5f04
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <TrendingDown color="#f87171" size={16} />
                <Text style={styles.summaryLabel}>Lowest Performance</Text>
              </View>
              <Text style={styles.summaryValueNegative}>
<<<<<<< HEAD
                {minValue.toFixed(1)}
                {selectedMetric === "speed"
                  ? " Mbps"
                  : selectedMetric === "signal"
                  ? " dBm"
                  : selectedMetric === "latency"
                  ? " ms"
                  : "/5"}
              </Text>
            </View>

=======
                {minValue.toFixed(1)}{selectedMetric === "speed" ? " Mbps" : selectedMetric === "signal" ? " dBm" : selectedMetric === "latency" ? " ms" : "/5"}
              </Text>
            </View>
            
>>>>>>> ef4e1333a5e331bf72eb9bfd203764fab9ca5f04
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <BarChart3 color="#60a5fa" size={16} />
                <Text style={styles.summaryLabel}>Variance</Text>
              </View>
              <Text style={styles.summaryValue}>
                {(maxValue - minValue).toFixed(1)} range
              </Text>
            </View>
<<<<<<< HEAD

=======
            
>>>>>>> ef4e1333a5e331bf72eb9bfd203764fab9ca5f04
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                {trendValue >= 0 ? (
                  <TrendingUp color="#34d399" size={16} />
                ) : (
                  <TrendingDown color="#f87171" size={16} />
                )}
                <Text style={styles.summaryLabel}>Trend</Text>
              </View>
<<<<<<< HEAD
              <Text
                style={[
                  styles.summaryValue,
                  { color: trendValue >= 0 ? "#34d399" : "#f87171" },
                ]}
              >
                {trendValue >= 0 ? "+" : ""}
                {trendValue}% change
=======
              <Text style={[
                styles.summaryValue,
                { color: trendValue >= 0 ? '#34d399' : '#f87171' }
              ]}>
                {trendValue >= 0 ? '+' : ''}{trendValue}% change
>>>>>>> ef4e1333a5e331bf72eb9bfd203764fab9ca5f04
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
<<<<<<< HEAD
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
=======
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
>>>>>>> ef4e1333a5e331bf72eb9bfd203764fab9ca5f04
    flex: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
    borderRadius: 8,
<<<<<<< HEAD
    backgroundColor: "rgba(255, 255, 255, 0.1)",
=======
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
>>>>>>> ef4e1333a5e331bf72eb9bfd203764fab9ca5f04
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
<<<<<<< HEAD
    color: "white",
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    color: "rgba(255, 255, 255, 0.7)",
=======
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
>>>>>>> ef4e1333a5e331bf72eb9bfd203764fab9ca5f04
    fontSize: 14,
    marginTop: 2,
  },
  refreshButton: {
    padding: 12,
    borderRadius: 8,
<<<<<<< HEAD
    backgroundColor: "rgba(255, 255, 255, 0.1)",
=======
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
>>>>>>> ef4e1333a5e331bf72eb9bfd203764fab9ca5f04
  },
  refreshing: {
    opacity: 0.6,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionContainer: {
    marginTop: 24,
  },
  sectionTitle: {
<<<<<<< HEAD
    color: "white",
    fontSize: 18,
    fontWeight: "600",
=======
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
>>>>>>> ef4e1333a5e331bf72eb9bfd203764fab9ca5f04
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  periodButtonsContainer: {
<<<<<<< HEAD
    flexDirection: "row",
=======
    flexDirection: 'row',
>>>>>>> ef4e1333a5e331bf72eb9bfd203764fab9ca5f04
    gap: 12,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
<<<<<<< HEAD
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
  },
  periodButtonActive: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
    shadowColor: "#3b82f6",
=======
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
    shadowColor: '#3b82f6',
>>>>>>> ef4e1333a5e331bf72eb9bfd203764fab9ca5f04
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  periodButtonText: {
<<<<<<< HEAD
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
=======
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  periodButtonTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  kpiContainer: {
    flexDirection: 'row',
>>>>>>> ef4e1333a5e331bf72eb9bfd203764fab9ca5f04
    gap: 16,
  },
  kpiCard: {
    flex: 1,
<<<<<<< HEAD
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  kpiHeader: {
    flexDirection: "row",
    alignItems: "center",
=======
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  kpiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
>>>>>>> ef4e1333a5e331bf72eb9bfd203764fab9ca5f04
    marginBottom: 12,
  },
  kpiIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
<<<<<<< HEAD
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
=======
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  kpiLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  kpiValueContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  kpiValue: {
    color: 'white',
    fontSize: 24,
    fontWeight: '700',
>>>>>>> ef4e1333a5e331bf72eb9bfd203764fab9ca5f04
    letterSpacing: -0.5,
  },
  kpiUnit: {
    fontSize: 14,
<<<<<<< HEAD
    color: "rgba(255, 255, 255, 0.6)",
    fontWeight: "500",
  },
  kpiSubtext: {
    color: "rgba(255, 255, 255, 0.6)",
=======
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },
  kpiSubtext: {
    color: 'rgba(255, 255, 255, 0.6)',
>>>>>>> ef4e1333a5e331bf72eb9bfd203764fab9ca5f04
    fontSize: 12,
    marginBottom: 4,
  },
  trendContainer: {
<<<<<<< HEAD
    flexDirection: "row",
    alignItems: "center",
=======
    flexDirection: 'row',
    alignItems: 'center',
>>>>>>> ef4e1333a5e331bf72eb9bfd203764fab9ca5f04
    gap: 4,
    marginBottom: 4,
  },
  trendText: {
    fontSize: 13,
<<<<<<< HEAD
    fontWeight: "600",
  },
  metricButtonsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
=======
    fontWeight: '600',
  },
  metricButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
>>>>>>> ef4e1333a5e331bf72eb9bfd203764fab9ca5f04
    gap: 12,
  },
  metricButton: {
    width: (width - 64) / 2,
<<<<<<< HEAD
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
=======
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  metricButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 2,
    shadowColor: 'rgba(96, 165, 250, 0.5)',
>>>>>>> ef4e1333a5e331bf72eb9bfd203764fab9ca5f04
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  metricIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
<<<<<<< HEAD
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
=======
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  metricButtonTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  chartTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
>>>>>>> ef4e1333a5e331bf72eb9bfd203764fab9ca5f04
    flex: 1,
    letterSpacing: -0.3,
  },
  chartStats: {
<<<<<<< HEAD
    alignItems: "flex-end",
  },
  chartStat: {
    color: "rgba(255, 255, 255, 0.6)",
=======
    alignItems: 'flex-end',
  },
  chartStat: {
    color: 'rgba(255, 255, 255, 0.6)',
>>>>>>> ef4e1333a5e331bf72eb9bfd203764fab9ca5f04
    fontSize: 12,
    marginBottom: 2,
  },
  chartStatValue: {
<<<<<<< HEAD
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
=======
    color: 'white',
    fontWeight: '600',
  },
  chartContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  barChartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 180,
    marginBottom: 20,
    alignItems: 'flex-end',
  },
  barChartColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginHorizontal: 2,
  },
  barChartBackground: {
    width: '85%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  barChartBar: {
    width: '100%',
    position: 'absolute',
>>>>>>> ef4e1333a5e331bf72eb9bfd203764fab9ca5f04
    bottom: 0,
    borderRadius: 6,
  },
  barChartLabel: {
<<<<<<< HEAD
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
=======
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    marginTop: 8,
    fontWeight: '500',
  },
  barChartValue: {
    color: 'white',
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
>>>>>>> ef4e1333a5e331bf72eb9bfd203764fab9ca5f04
    gap: 20,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
<<<<<<< HEAD
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
=======
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
>>>>>>> ef4e1333a5e331bf72eb9bfd203764fab9ca5f04
    gap: 8,
  },
  legendColor: {
    width: 14,
    height: 14,
    borderRadius: 3,
  },
  legendText: {
<<<<<<< HEAD
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 12,
    fontWeight: "500",
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
=======
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '500',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
>>>>>>> ef4e1333a5e331bf72eb9bfd203764fab9ca5f04
    gap: 12,
  },
  summaryCard: {
    width: (width - 64) / 2,
<<<<<<< HEAD
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
=======
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
>>>>>>> ef4e1333a5e331bf72eb9bfd203764fab9ca5f04
    gap: 8,
    marginBottom: 8,
  },
  summaryLabel: {
<<<<<<< HEAD
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
=======
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  summaryValue: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  summaryValuePositive: {
    color: '#34d399',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  summaryValueNegative: {
    color: '#f87171',
    fontSize: 15,
    fontWeight: '600',
>>>>>>> ef4e1333a5e331bf72eb9bfd203764fab9ca5f04
    letterSpacing: -0.2,
  },
  bottomPadding: {
    height: 40,
  },
<<<<<<< HEAD
});
=======
});
>>>>>>> ef4e1333a5e331bf72eb9bfd203764fab9ca5f04
