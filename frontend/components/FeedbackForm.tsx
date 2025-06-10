import { NetworkMetrics } from "@/lib/types";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface FeedbackPageProps {
  onBack: () => void;
  selectedRating: number | null;
  onEmojiSelect?: (rating: number) => void;
  showRatingSelection?: boolean;
  networkMetrics: NetworkMetrics | null;
}

export default function FeedbackPage({
  onBack,
  selectedRating,
  onEmojiSelect,
  networkMetrics,
  showRatingSelection = false,
}: FeedbackPageProps) {
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [feedbackText, setFeedbackText] = useState("");
  const [selectedContext, setSelectedContext] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);

    if (!networkMetrics) {
      console.warn("No network metrics available");
      Alert.alert("Error", "Network metrics missing. Please try again.");
      setIsSubmitting(false);
      return;
    }

    const {
      signalStrength,
      networkType,
      carrier,
      frequency,
      bandwidth,
      cellId,
      pci,
      dataSpeed,
      uploadSpeed,
      latency,
      isConnected,
      throughput,
      location,
      device,
    } = networkMetrics;

    const requestBody = {
      feedback: {
        userId: "user_12345", // Replace with actual user ID
        rating: selectedRating,
        contextInfo: {
          location: location ? "Captured" : "Unknown",
          time: new Date().toISOString(),
          situationContext: selectedContext,
        },
        specificIssues: selectedIssues.map((type) => ({ type })),
        additionalDetails: feedbackText,
      },
      technicalData: {
        signalStrength,
        networkType,
        carrier,
        frequency,
        bandwidth,
        cellId,
        pci,
        dataSpeed,
        uploadSpeed,
        latency,
        isConnected,
        throughput,
        coordinates: location || null,
      },
      deviceInfo: {
        platform: device.platform,
        model: device.model || "Unknown",
        osVersion: device.osVersion || "Unknown",
      },
    };

    try {
      const response = await fetch(
        "https://qoe-backend-ov95.onrender.com/api/network-feedback",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Something went wrong!");
      }

      setSubmitted(true);
      Alert.alert("Success", "Feedback submitted successfully!");
    } catch (error) {
      console.error("Submit error:", error);
      Alert.alert("Error", "Failed to submit feedback.");
    } finally {
      setTimeout(() => {
        setIsSubmitting(false);
      }, 3000);
    }
  };

  const handleEmojiRating = (rating: number) => {
    if (onEmojiSelect) {
      onEmojiSelect(rating);
    }
  };

  const getRatingInfo = (rating: number | null) => {
    if (!rating) return { emoji: "🤔", label: "Unknown", color: "#9CA3AF" };

    const ratings = [
      { emoji: "😞", label: "Poor Experience", color: "#F87171" },
      { emoji: "😐", label: "Fair Experience", color: "#FB923C" },
      { emoji: "🙂", label: "Good Experience", color: "#FBBF24" },
      { emoji: "😊", label: "Great Experience", color: "#34D399" },
      { emoji: "🤩", label: "Excellent Experience", color: "#6EE7B7" },
    ];

    return ratings[rating - 1] || ratings[0];
  };

  const issueTypes = [
    {
      id: "slow-data",
      label: "Slow Data Speed",
      icon: "wifi-outline",
      severity: "high",
    },
    {
      id: "call-drops",
      label: "Call Drops/Quality",
      icon: "call-outline",
      severity: "high",
    },
    {
      id: "poor-video",
      label: "Video Streaming Issues",
      icon: "videocam-outline",
      severity: "medium",
    },
    {
      id: "web-loading",
      label: "Web Page Loading",
      icon: "globe-outline",
      severity: "medium",
    },
    {
      id: "app-performance",
      label: "App Performance",
      icon: "phone-portrait-outline",
      severity: "low",
    },
    {
      id: "no-connection",
      label: "No Connection",
      icon: "warning-outline",
      severity: "critical",
    },
  ];

  const contextOptions = [
    { id: "indoor", label: "Indoor" },
    { id: "outdoor", label: "Outdoor" },
    { id: "moving", label: "Moving/Vehicle" },
    { id: "stationary", label: "Stationary" },
    { id: "crowded", label: "Crowded Area" },
    { id: "peak-hours", label: "Peak Hours" },
  ];

  const toggleIssue = (issueId: string) => {
    setSelectedIssues((prev) =>
      prev.includes(issueId)
        ? prev.filter((id) => id !== issueId)
        : [...prev, issueId]
    );
  };

  const toggleContext = (contextId: string) => {
    setSelectedContext((prev) =>
      prev.includes(contextId)
        ? prev.filter((id) => id !== contextId)
        : [...prev, contextId]
    );
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "#EF4444";
      case "high":
        return "#F97316";
      case "medium":
        return "#EAB308";
      case "low":
        return "#3B82F6";
      default:
        return "#6B7280";
    }
  };

  const ratingInfo = getRatingInfo(selectedRating);

  // Show rating selection screen if showRatingSelection is true
  if (showRatingSelection) {
    return (
      <LinearGradient
        colors={["#111827", "#374151", "#111827"]}
        style={styles.container}
      >
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color="white" />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Network Experience</Text>
              <Text style={styles.headerSubtitle}>
                Rate your connection quality
              </Text>
            </View>
          </View>

          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Rate Your Network Experience</Text>
              <Text style={styles.ratingSubtitle}>
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
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (submitted) {
    return (
      <LinearGradient
        colors={["#111827", "#374151", "#111827"]}
        style={styles.container}
      >
        <StatusBar barStyle="light-content" />
        <View style={styles.successContainer}>
          <View style={styles.successCard}>
            <Text style={styles.successEmoji}>✅</Text>
            <Text style={styles.successTitle}>Feedback Submitted</Text>
            <Text style={styles.successText}>
              Thank you for helping improve network quality in your area
            </Text>
            <Text style={styles.redirectText}>Redirecting in 3 seconds...</Text>
          </View>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={["#111827", "#374151", "#111827"]}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Network Experience Feedback</Text>
            <Text style={styles.headerSubtitle}>
              Detailed quality assessment
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {/* Rating Summary */}
          <View style={styles.card}>
            <View style={styles.ratingRow}>
              <Text style={styles.ratingEmoji}>{ratingInfo.emoji}</Text>
              <View>
                <Text style={[styles.ratingLabel, { color: ratingInfo.color }]}>
                  {ratingInfo.label}
                </Text>
                <Text style={styles.ratingSubtext}>
                  Selected rating: {selectedRating}/5
                </Text>
              </View>
            </View>
          </View>

          {/* Location & Time Context */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="location-outline" size={20} color="#34D399" />
              <Text style={styles.cardTitle}>Context Information</Text>
            </View>

            <View style={styles.contextInfoRow}>
              <View style={styles.contextInfoItem}>
                <Text style={styles.contextLabel}>Location</Text>
                <Text style={styles.contextValue}>Downtown Area</Text>
              </View>
              <View style={styles.contextInfoItem}>
                <Text style={styles.contextLabel}>Time</Text>
                <Text style={styles.contextValue}>
                  {new Date().toLocaleTimeString()}
                </Text>
              </View>
            </View>

            <View style={styles.sectionSpacing}>
              <Text style={styles.sectionTitle}>Situation Context</Text>
              <View style={styles.buttonGrid}>
                {contextOptions.map((context) => (
                  <TouchableOpacity
                    key={context.id}
                    onPress={() => toggleContext(context.id)}
                    style={[
                      styles.contextButton,
                      selectedContext.includes(context.id) &&
                        styles.contextButtonSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.contextButtonText,
                        selectedContext.includes(context.id) &&
                          styles.contextButtonTextSelected,
                      ]}
                    >
                      {context.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Issue Selection */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Specific Issues Experienced</Text>
            <View style={styles.issuesList}>
              {issueTypes.map((issue) => {
                const isSelected = selectedIssues.includes(issue.id);
                return (
                  <TouchableOpacity
                    key={issue.id}
                    onPress={() => toggleIssue(issue.id)}
                    style={[
                      styles.issueButton,
                      { borderColor: getSeverityColor(issue.severity) + "80" },
                      isSelected && styles.issueButtonSelected,
                    ]}
                  >
                    <Ionicons
                      name={issue.icon as any}
                      size={20}
                      color={isSelected ? "white" : "#D1D5DB"}
                    />
                    <View style={styles.issueTextContainer}>
                      <Text
                        style={[
                          styles.issueLabel,
                          isSelected && styles.issueSelectedText,
                        ]}
                      >
                        {issue.label}
                      </Text>
                      <Text
                        style={[
                          styles.issueSeverity,
                          isSelected && styles.issueSelectedText,
                        ]}
                      >
                        {issue.severity} priority
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Detailed Feedback */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Additional Details (Optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Describe your network experience in detail. What were you trying to do? What specific problems did you encounter? Any other relevant information..."
              placeholderTextColor="#9CA3AF"
              value={feedbackText}
              onChangeText={setFeedbackText}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <Text style={styles.helperText}>
              Your feedback helps network engineers identify and resolve issues
              more effectively
            </Text>
          </View>

          {/* Technical Data Notice */}
          <View style={styles.card}>
            <View style={styles.technicalDataHeader}>
              <Ionicons name="time-outline" size={20} color="#93C5FD" />
              <View style={styles.technicalDataTextContainer}>
                <Text style={styles.technicalDataTitle}>
                  Technical Data Included
                </Text>
                <Text style={styles.technicalDataText}>
                  Signal strength, network type, location, and performance
                  metrics will be automatically included with your feedback
                </Text>
              </View>
            </View>
          </View>

          {/* Submit Button */}
          <View style={styles.submitContainer}>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isSubmitting}
              style={[
                styles.submitButton,
                isSubmitting && styles.submitButtonDisabled,
              ]}
            >
              {isSubmitting ? (
                <View style={styles.submitButtonContent}>
                  <ActivityIndicator size="small" color="white" />
                  <Text style={styles.submitButtonText}>
                    Submitting Feedback...
                  </Text>
                </View>
              ) : (
                <View style={styles.submitButtonContent}>
                  <Ionicons name="send-outline" size={20} color="white" />
                  <Text style={styles.submitButtonText}>
                    Submit Network Feedback
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <Text style={styles.privacyText}>
              Anonymous submission • Data used for network optimization only
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "white",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
    marginLeft: 8,
    marginBottom: 16,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  ratingSubtext: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
  },
  contextInfoRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  contextInfoItem: {
    flex: 1,
  },
  contextLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
  },
  contextValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "white",
  },
  sectionSpacing: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "white",
    marginBottom: 12,
  },
  buttonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  contextButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    width: "100%",
  },
  contextButtonSelected: {
    backgroundColor: "rgba(59, 130, 246, 0.3)",
    borderColor: "#3B82F6",
  },
  contextButtonText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
  },
  contextButtonTextSelected: {
    color: "white",
  },
  issuesList: {
    gap: 12,
  },
  issueButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  issueButtonSelected: {
    backgroundColor: "rgba(59, 130, 246, 0.3)",
    borderColor: "#3B82F6",
  },
  issueTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  issueLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.8)",
  },
  issueSeverity: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
    textTransform: "capitalize",
  },
  issueSelectedText: {
    color: "white",
  },
  textInput: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    padding: 12,
    color: "white",
    fontSize: 12,
    minHeight: 100,
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
  },
  technicalDataHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  technicalDataTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  technicalDataTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "white",
    marginBottom: 4,
  },
  technicalDataText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
    lineHeight: 16,
  },
  submitContainer: {
    paddingBottom: 32,
  },
  submitButton: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  privacyText: {
    textAlign: "center",
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
  },
  successContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  successCard: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    maxWidth: 320,
    width: "100%",
  },
  successEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "white",
    marginBottom: 8,
  },
  successText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
    marginBottom: 16,
  },
  redirectText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
  },
  ratingSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: 24,
    textAlign: "center",
  },
  emojiRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 8,
  },
  emojiButton: {
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    minWidth: 60,
  },
  emoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  emojiLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "500",
  },
});
