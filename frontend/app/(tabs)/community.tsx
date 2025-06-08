import React, { useState } from "react";
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet 
} from "react-native";
import { 
  ChevronLeft, 
  Users, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Clock, 
  Signal, 
  Wifi, 
  Phone, 
  Radio 
} from "lucide-react-native";

export default function CommunityPage({ onBack }: { onBack: () => void }) {
  const [selectedTimeframe, setSelectedTimeframe] = useState("24h");
  const [selectedArea, setSelectedArea] = useState("current");

  const timeframes = [
    { value: "1h", label: "1H" },
    { value: "24h", label: "24H" },
    { value: "7d", label: "7D" },
    { value: "30d", label: "30D" },
  ];

  const areaOptions = [
    { value: "current", label: "Current Area" },
    { value: "city", label: "City Wide" },
    { value: "region", label: "Regional" },
  ];

  const communityData = [
    {
      area: "Downtown Core",
      distance: "Current location",
      reports: 156,
      avgRating: 4.2,
      trend: "up",
      issues: ["Latency spikes", "5G handover"],
      lastUpdate: "3 min ago",
      signalStrength: -62,
      avgSpeed: 47.3,
    },
    {
      area: "Business District",
      distance: "0.8 km NE",
      reports: 89,
      avgRating: 3.8,
      trend: "down",
      issues: ["Poor indoor coverage", "Congestion"],
      lastUpdate: "8 min ago",
      signalStrength: -78,
      avgSpeed: 32.1,
    },
    {
      area: "Residential North",
      distance: "1.2 km N",
      reports: 234,
      avgRating: 4.5,
      trend: "up",
      issues: ["Video buffering"],
      lastUpdate: "5 min ago",
      signalStrength: -58,
      avgSpeed: 52.7,
    },
  ];

  const recentReports = [
    { emoji: "😊", rating: 4, area: "Downtown", time: "2 min ago", issue: null, tech: "5G NR" },
    { emoji: "😐", rating: 3, area: "Business District", time: "5 min ago", issue: "High latency", tech: "LTE" },
    { emoji: "🤩", rating: 5, area: "Residential", time: "7 min ago", issue: null, tech: "5G NR" },
    { emoji: "😞", rating: 2, area: "Business District", time: "12 min ago", issue: "Call quality", tech: "LTE" },
    { emoji: "🙂", rating: 4, area: "Downtown", time: "15 min ago", issue: null, tech: "5G NR" },
  ];

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp color="#34d399" size={16} />;
      case "down":
        return <TrendingDown color="#f87171" size={16} />;
      default:
        return <Minus color="#9ca3af" size={16} />;
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return "#6ee7b7";
    if (rating >= 4.0) return "#34d399";
    if (rating >= 3.5) return "#facc15";
    if (rating >= 3.0) return "#fb923c";
    return "#f87171";
  };

  const getBadgeColor = (severity: string) => {
    switch (severity) {
      case "High":
        return { bg: "rgba(239, 68, 68, 0.2)", text: "#fca5a5", border: "rgba(248, 113, 113, 0.3)" };
      case "Medium":
        return { bg: "rgba(249, 115, 22, 0.2)", text: "#fdba74", border: "rgba(251, 146, 60, 0.3)" };
      case "Low":
        return { bg: "rgba(234, 179, 8, 0.2)", text: "#fde047", border: "rgba(253, 224, 71, 0.3)" };
      default:
        return { bg: "rgba(59, 130, 246, 0.2)", text: "#93c5fd", border: "rgba(147, 197, 253, 0.3)" };
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ChevronLeft color="white" size={20} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Community Network Analytics</Text>
          <Text style={styles.headerSubtitle}>Real-time crowdsourced QoE data</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Filters */}
        <View style={styles.card}>
          <View style={styles.filterSection}>
            <Text style={styles.filterTitle}>Analysis Period</Text>
            <View style={styles.filterButtons}>
              {timeframes.map((timeframe) => (
                <TouchableOpacity
                  key={timeframe.value}
                  style={[
                    styles.filterButton,
                    selectedTimeframe === timeframe.value && styles.filterButtonActive
                  ]}
                  onPress={() => setSelectedTimeframe(timeframe.value)}
                >
                  <Text style={[
                    styles.filterButtonText,
                    selectedTimeframe === timeframe.value && styles.filterButtonTextActive
                  ]}>
                    {timeframe.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterTitle}>Geographic Scope</Text>
            <View style={styles.filterButtons}>
              {areaOptions.map((area) => (
                <TouchableOpacity
                  key={area.value}
                  style={[
                    styles.filterButton,
                    selectedArea === area.value && styles.filterButtonActive
                  ]}
                  onPress={() => setSelectedArea(area.value)}
                >
                  <Text style={[
                    styles.filterButtonText,
                    selectedArea === area.value && styles.filterButtonTextActive
                  ]}>
                    {area.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Area Analysis */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Radio color="#93c5fd" size={20} />
            <Text style={styles.cardTitle}>Geographic QoE Analysis</Text>
          </View>
          <View style={styles.cardContent}>
            {communityData.map((area, index) => (
              <View key={index} style={styles.areaCard}>
                <View style={styles.areaHeader}>
                  <View style={styles.areaInfo}>
                    <Text style={styles.areaName}>{area.area}</Text>
                    <Text style={styles.areaDistance}>{area.distance}</Text>
                  </View>
                  <View style={styles.areaStats}>
                    <View style={styles.ratingContainer}>
                      <Text style={[styles.areaRating, { color: getRatingColor(area.avgRating) }]}>
                        {area.avgRating}
                      </Text>
                      {getTrendIcon(area.trend)}
                    </View>
                    <Text style={styles.reportCount}>{area.reports} reports</Text>
                  </View>
                </View>

                <View style={styles.areaMetrics}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Signal Strength</Text>
                    <Text style={styles.metricValue}>{area.signalStrength} dBm</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Avg Speed</Text>
                    <Text style={styles.metricValue}>{area.avgSpeed} Mbps</Text>
                  </View>
                </View>

                <View style={styles.areaFooter}>
                  <View style={styles.issuesContainer}>
                    {area.issues.map((issue, issueIndex) => (
                      <View 
                        key={issueIndex} 
                        style={[
                          styles.issueBadge,
                          { 
                            backgroundColor: "rgba(249, 115, 22, 0.2)",
                            borderColor: "rgba(251, 146, 60, 0.3)",
                          }
                        ]}
                      >
                        <Text style={[styles.issueText, { color: "#fdba74" }]}>{issue}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.updateTime}>
                    <Clock color="rgba(255, 255, 255, 0.5)" size={12} />
                    <Text style={styles.updateText}>{area.lastUpdate}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Real-time Feedback Stream */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Users color="#6ee7b7" size={20} />
            <Text style={styles.cardTitle}>Live Feedback Stream</Text>
          </View>
          <View style={styles.cardContent}>
            {recentReports.map((report, index) => (
              <View key={index} style={styles.feedbackCard}>
                <Text style={styles.feedbackEmoji}>{report.emoji}</Text>
                <View style={styles.feedbackContent}>
                  <View style={styles.feedbackHeader}>
                    <Text style={styles.feedbackArea}>{report.area}</Text>
                    <View style={styles.feedbackBadge}>
                      <Text style={[styles.badgeText, { color: "#93c5fd" }]}>{report.tech}</Text>
                    </View>
                    {report.issue && (
                      <View style={[
                        styles.feedbackBadge,
                        { 
                          backgroundColor: "rgba(239, 68, 68, 0.2)",
                          borderColor: "rgba(248, 113, 113, 0.3)",
                        }
                      ]}>
                        <Text style={[styles.badgeText, { color: "#fca5a5" }]}>{report.issue}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.feedbackTime}>{report.time}</Text>
                </View>
                <View style={styles.ratingStars}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Text 
                      key={star} 
                      style={[
                        styles.star,
                        star <= report.rating ? styles.starActive : styles.starInactive
                      ]}
                    >
                      ★
                    </Text>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Technical Issues Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Network Issues Analysis (24h)</Text>
          <View style={styles.issuesList}>
            <View style={styles.issueItem}>
              <View style={styles.issueInfo}>
                <Signal color="rgba(255, 255, 255, 0.6)" size={16} />
                <Text style={styles.issueName}>RF Coverage Issues</Text>
              </View>
              <View style={styles.issueStats}>
                <View style={[
                  styles.issueBadge,
                  { 
                    backgroundColor: "rgba(239, 68, 68, 0.2)",
                    borderColor: "rgba(248, 113, 113, 0.3)",
                  }
                ]}>
                  <Text style={[styles.badgeText, { color: "#fca5a5" }]}>23 reports</Text>
                </View>
                <Text style={styles.issueSeverity}>High</Text>
              </View>
            </View>

            <View style={styles.issueItem}>
              <View style={styles.issueInfo}>
                <Wifi color="rgba(255, 255, 255, 0.6)" size={16} />
                <Text style={styles.issueName}>Throughput Degradation</Text>
              </View>
              <View style={styles.issueStats}>
                <View style={[
                  styles.issueBadge,
                  { 
                    backgroundColor: "rgba(249, 115, 22, 0.2)",
                    borderColor: "rgba(251, 146, 60, 0.3)",
                  }
                ]}>
                  <Text style={[styles.badgeText, { color: "#fdba74" }]}>18 reports</Text>
                </View>
                <Text style={styles.issueSeverity}>Medium</Text>
              </View>
            </View>

            <View style={styles.issueItem}>
              <View style={styles.issueInfo}>
                <Phone color="rgba(255, 255, 255, 0.6)" size={16} />
                <Text style={styles.issueName}>Voice Quality Issues</Text>
              </View>
              <View style={styles.issueStats}>
                <View style={[
                  styles.issueBadge,
                  { 
                    backgroundColor: "rgba(234, 179, 8, 0.2)",
                    borderColor: "rgba(253, 224, 71, 0.3)",
                  }
                ]}>
                  <Text style={[styles.badgeText, { color: "#fde047" }]}>12 reports</Text>
                </View>
                <Text style={styles.issueSeverity}>Low</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
  },
  scrollView: {
    padding: 10,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterSection: {
    marginBottom: 16,
  },
  filterTitle: {
    color: 'white',
    fontWeight: '500',
    marginBottom: 8,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  filterButtonText: {
    color: 'white',
    fontSize: 14,
  },
  filterButtonTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cardContent: {
    gap: 12,
  },
  areaCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  areaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  areaInfo: {
    flex: 1,
  },
  areaName: {
    color: 'white',
    fontWeight: '500',
    fontSize: 16,
  },
  areaDistance: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
  },
  areaStats: {
    alignItems: 'flex-end',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  areaRating: {
    fontWeight: '600',
    fontSize: 16,
  },
  reportCount: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
  },
  areaMetrics: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  metricItem: {
    flex: 1,
  },
  metricLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
  },
  metricValue: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14,
  },
  areaFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  issuesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  issueBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  issueText: {
    fontSize: 12,
  },
  updateTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  updateText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
  },
  feedbackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  feedbackEmoji: {
    fontSize: 24,
  },
  feedbackContent: {
    flex: 1,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 2,
  },
  feedbackArea: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14,
  },
  feedbackBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
  },
  feedbackTime: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
  },
  ratingStars: {
    flexDirection: 'row',
  },
  star: {
    fontSize: 14,
  },
  starActive: {
    color: '#facc15',
  },
  starInactive: {
    color: 'rgba(255, 255, 255, 0.2)',
  },
  issuesList: {
    gap: 12,
  },
  issueItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  issueInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  issueName: {
    color: 'white',
    fontSize: 14,
  },
  issueStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  issueSeverity: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
  },
});