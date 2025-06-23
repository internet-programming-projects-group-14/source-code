import { Router } from "express";
import { db, admin } from "../firebase.mjs";

const router = Router();

/**
 * Geographic QoE Analysis Endpoint
 * Analyzes network quality by geographic areas
 */
// Helper functions
function getAreaKey(location, scope) {
  switch (scope) {
    case "Current Area":
    case "City Wide":
      return `${location.city}_${location.subregion}`;
    case "Regional":
      return location.region;
    default:
      return location.city;
  }
}

function getAreaDisplayName(location, scope) {
  switch (scope) {
    case "Current Area":
      return `${location.city} (Current Area)`;
    case "City Wide":
      return location.city;
    case "Regional":
      return `${location.city}, ${location.subregion}`;
    default:
      return location.city;
  }
}

function calculateAverage(values) {
  if (!values || values.length === 0) return null;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

function calculateQoEScore({ signalStrength, dataSpeed, latency, userRating }) {
  let score = 3.0; // Base score

  // Signal strength impact (-40 to -120 dBm range)
  if (signalStrength) {
    if (signalStrength >= -70) score += 1.0; // Excellent
    else if (signalStrength >= -85) score += 0.5; // Good
    else if (signalStrength >= -100) score += 0; // Fair
    else score -= 0.5; // Poor
  }

  // Data speed impact
  if (dataSpeed) {
    if (dataSpeed >= 50) score += 1.0; // Excellent
    else if (dataSpeed >= 25) score += 0.5; // Good
    else if (dataSpeed >= 10) score += 0; // Fair
    else score -= 0.5; // Poor
  }

  // Latency impact (lower is better)
  if (latency) {
    if (latency <= 50) score += 0.5; // Excellent
    else if (latency <= 100) score += 0; // Good
    else if (latency <= 200) score -= 0.25; // Fair
    else score -= 0.5; // Poor
  }

  // User rating impact
  if (userRating) {
    score += (userRating - 3) * 0.3; // Adjust based on user satisfaction
  }

  return Math.max(0, Math.min(5, score)); // Clamp between 0-5
}

function identifyIssues({
  signalStrength,
  dataSpeed,
  latency,
  reportedIssues,
  networkTypes,
}) {
  const issues = [];

  // Technical issues
  if (signalStrength && signalStrength < -100) {
    issues.push("Poor signal coverage");
  }

  if (dataSpeed && dataSpeed < 10) {
    issues.push("Slow data speeds");
  }

  if (latency && latency > 200) {
    issues.push("High latency");
  }

  // Network type issues
  const total5G = networkTypes["5G"] || 0;
  const total4G = networkTypes["4G"] || 0;
  const total3G = networkTypes["3G"] || 0;
  const totalConnections = total5G + total4G + total3G;

  if (totalConnections > 0 && total3G / totalConnections > 0.3) {
    issues.push("Frequent 3G fallback");
  }

  if (totalConnections > 0 && total5G / totalConnections < 0.1) {
    issues.push("Limited 5G coverage");
  }

  // Reported issues
  const issueFrequency = {};
  reportedIssues.forEach((issue) => {
    issueFrequency[issue] = (issueFrequency[issue] || 0) + 1;
  });

  // Add frequently reported issues
  Object.entries(issueFrequency).forEach(([issue, count]) => {
    if (count >= 3) {
      // Threshold for significant issues
      issues.push(`Frequent ${issue} reports`);
    }
  });

  return issues.slice(0, 3); // Limit to top 3 issues
}

function generateTrend() {
  // Simplified trend generation - in real implementation, compare with historical data
  const trends = ["↗", "↘", "→"];
  return trends[Math.floor(Math.random() * trends.length)];
}

router.get("/geographic-qoe-analysis", async (req, res) => {
  try {
    const {
      period = "1H", // 1H, 24H, 7D, 30D
      scope = "Current Area", // Current Area, City Wide, Regional
      userLocation, // { lat, lng, city, subregion, region }
      radius = 1000, // meters for Current Area scope
    } = req.query;

    // Calculate time range based on period
    const now = new Date();
    const timeRanges = {
      "1H": new Date(now.getTime() - 60 * 60 * 1000),
      "24H": new Date(now.getTime() - 24 * 60 * 60 * 1000),
      "7D": new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      "30D": new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    };

    const startTime = timeRanges[period];

    if (!startTime) {
      return res.status(400).json({ error: "Invalid period specified" });
    }

    // Build location filter based on scope
    let locationFilter = {};
    if (userLocation) {
      const location = JSON.parse(userLocation);

      switch (scope) {
        case "Current Area":
          // For current area, we'll filter by proximity (simplified for demo)
          locationFilter = {
            // In a real implementation, you'd use geohashing or spatial queries
            // For now, we'll filter by city as approximation
            "location.city": location.city,
          };
          break;
        case "City Wide":
          locationFilter = {
            "location.city": location.city,
          };
          break;
        case "Regional":
          locationFilter = {
            "location.region": location.region,
          };
          break;
      }
    }

    // Fetch signal metrics
    let signalQuery = db
      .collection("signalMetrics")
      .where("timestamp", ">=", startTime);

    // Apply location filters
    Object.entries(locationFilter).forEach(([field, value]) => {
      signalQuery = signalQuery.where(field, "==", value);
    });

    const signalSnapshot = await signalQuery.get();

    // Fetch feedback data
    let feedbackQuery = db
      .collection("feedback")
      .where("timestamp", ">=", startTime);

    const feedbackSnapshot = await feedbackQuery.get();

    // Process signal metrics by area
    const areaMetrics = {};
    const areaFeedback = {};

    // Group signal metrics by location
    signalSnapshot.forEach((doc) => {
      const data = doc.data();
      const location = data.location;

      if (!location || !location.city) return;

      const areaKey = getAreaKey(location, scope);

      if (!areaMetrics[areaKey]) {
        areaMetrics[areaKey] = {
          location: location,
          signalStrengths: [],
          dataSpeeds: [],
          latencies: [],
          reports: 0,
          networkTypes: {},
          operators: {},
          issues: [],
        };
      }

      const area = areaMetrics[areaKey];
      area.reports++;

      // Collect metrics
      if (data.signal_strength)
        area.signalStrengths.push(parseFloat(data.signal_strength));
      if (data.data_speed) area.dataSpeeds.push(parseFloat(data.data_speed));
      if (data.latency) area.latencies.push(parseFloat(data.latency));

      // Count network types and operators
      if (data.network_type) {
        area.networkTypes[data.network_type] =
          (area.networkTypes[data.network_type] || 0) + 1;
      }
      if (data.operator) {
        area.operators[data.operator] =
          (area.operators[data.operator] || 0) + 1;
      }
    });

    // Group feedback by location
    feedbackSnapshot.forEach((doc) => {
      const data = doc.data();

      // Extract location from feedback (you might need to adjust this based on your data structure)
      let location;
      if (typeof data.location === "string") {
        try {
          location = JSON.parse(data.location);
        } catch (e) {
          return; // Skip invalid location data
        }
      } else {
        location = data.location;
      }

      if (!location || !location.city) return;

      const areaKey = getAreaKey(location, scope);

      if (!areaFeedback[areaKey]) {
        areaFeedback[areaKey] = {
          ratings: [],
          issues: [],
          totalFeedback: 0,
        };
      }

      const feedback = areaFeedback[areaKey];
      feedback.totalFeedback++;

      if (data.rating) feedback.ratings.push(data.rating);
      if (data.issue_type && Array.isArray(data.issue_type)) {
        feedback.issues.push(...data.issue_type);
      }
    });

    // Calculate QoE scores and generate analysis
    const analysis = [];

    Object.entries(areaMetrics).forEach(([areaKey, metrics]) => {
      const feedback = areaFeedback[areaKey] || {
        ratings: [],
        issues: [],
        totalFeedback: 0,
      };

      // Calculate averages
      const avgSignalStrength = calculateAverage(metrics.signalStrengths);
      const avgDataSpeed = calculateAverage(metrics.dataSpeeds);
      const avgLatency = calculateAverage(metrics.latencies);
      const avgRating = calculateAverage(feedback.ratings);

      // Calculate QoE score (0-5 scale)
      const qoeScore = calculateQoEScore({
        signalStrength: avgSignalStrength,
        dataSpeed: avgDataSpeed,
        latency: avgLatency,
        userRating: avgRating,
      });

      // Identify issues
      const issues = identifyIssues({
        signalStrength: avgSignalStrength,
        dataSpeed: avgDataSpeed,
        latency: avgLatency,
        reportedIssues: feedback.issues,
        networkTypes: metrics.networkTypes,
      });

      // Get dominant network type and operator
      const dominantNetworkType = Object.keys(metrics.networkTypes).reduce(
        (a, b) => (metrics.networkTypes[a] > metrics.networkTypes[b] ? a : b),
        "4G"
      );
      const dominantOperator = Object.keys(metrics.operators).reduce(
        (a, b) => (metrics.operators[a] > metrics.operators[b] ? a : b),
        "Unknown"
      );

      analysis.push({
        areaName: getAreaDisplayName(metrics.location, scope),
        location: metrics.location,
        qoeScore: parseFloat(qoeScore.toFixed(1)),
        trend: generateTrend(), // You can implement trend calculation based on historical data
        reports: metrics.reports + feedback.totalFeedback,
        metrics: {
          signalStrength: avgSignalStrength
            ? `${avgSignalStrength.toFixed(0)} dBm`
            : "N/A",
          avgSpeed: avgDataSpeed ? `${avgDataSpeed.toFixed(1)} Mbps` : "N/A",
          avgLatency: avgLatency ? `${avgLatency.toFixed(0)}ms` : "N/A",
          userRating: avgRating ? avgRating.toFixed(1) : "N/A",
        },
        issues,
        networkInfo: {
          dominantType: dominantNetworkType,
          dominantOperator: dominantOperator,
        },
        lastUpdated: new Date().toISOString(),
      });
    });

    // Sort by QoE score (descending)
    analysis.sort((a, b) => b.qoeScore - a.qoeScore);

    res.json({
      success: true,
      period,
      scope,
      analysisTime: new Date().toISOString(),
      areas: analysis,
      summary: {
        totalAreas: analysis.length,
        avgQoEScore: calculateAverage(analysis.map((a) => a.qoeScore)),
        totalReports: analysis.reduce((sum, a) => sum + a.reports, 0),
      },
    });
  } catch (error) {
    console.error("Geographic QoE Analysis Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to perform geographic QoE analysis",
      details: error.message,
    });
  }
});

/**
 * Live Feedback Stream Endpoint
 * Returns the latest 7 feedback entries with basic info
 */
router.get("/live-feedback-stream", async (req, res) => {
  try {
    const {
      userLocation, // { lat, lng, city, subregion, region }
      scope = "City Wide", // Current Area, City Wide, Regional
      radius = 5000, // meters for Current Area scope
    } = req.query;

    // Build location filter based on scope
    let locationFilter = {};
    if (userLocation) {
      const location = JSON.parse(userLocation);

      switch (scope) {
        case "Current Area":
          locationFilter = {
            "location.city": location.city,
          };
          break;
        case "City Wide":
          locationFilter = {
            "location.city": location.city,
          };
          break;
        case "Regional":
          locationFilter = {
            "location.region": location.region,
          };
          break;
      }
    }

    // Build query for recent feedback
    let feedbackQuery = db
      .collection("feedback")
      .orderBy("timestamp", "desc")
      .limit(20); // Get more than 7 to filter by location

    const feedbackSnapshot = await feedbackQuery.get();
    const feedbackEntries = [];

    feedbackSnapshot.forEach((doc) => {
      const data = doc.data();

      // Extract and parse location
      let location;
      if (typeof data.location === "string") {
        try {
          location = JSON.parse(data.location);
        } catch (e) {
          return; // Skip invalid location data
        }
      } else {
        location = data.location;
      }

      if (!location || (!location.lat && !location.lng)) return;

      // Apply location filtering if specified
      if (Object.keys(locationFilter).length > 0) {
        const shouldInclude = Object.entries(locationFilter).every(
          ([field, value]) => {
            const fieldPath = field.split(".");
            let fieldValue = location;
            for (const path of fieldPath.slice(1)) {
              // Skip 'location' prefix
              fieldValue = fieldValue?.[path];
            }
            return fieldValue === value;
          }
        );

        if (!shouldInclude) return;
      }

      // Determine emoji based on rating and issues
      const emoji = getFeedbackEmoji(data.rating, data.issue_type);

      // Extract area name from location
      const areaName = getAreaName(location);

      // Get network type from associated signal data or context
      const networkType = extractNetworkType(data);

      // Get primary issue if any
      const primaryIssue = getPrimaryIssue(data.issue_type, data.comment);

      feedbackEntries.push({
        id: doc.id,
        areaName,
        networkType,
        rating: data.rating || null,
        primaryIssue,
        emoji,
        timestamp: data.timestamp.toDate(),
        longitude: location.lng || location.longitude,
        latitude: location.lat || location.latitude,
      });
    });

    // Sort by timestamp (most recent first) and limit to 7
    const recentFeedback = feedbackEntries
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 7);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      entries: recentFeedback,
    });
  } catch (error) {
    console.error("Live Feedback Stream Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch live feedback stream",
      details: error.message,
    });
  }
});

/**
 * Network Issues Analysis Endpoint
 * Analyzes network issues over the last 24 hours with priority levels
 */
router.get("/network-issues-analysis", async (req, res) => {
  try {
    const {
      period = "24h", // 24h, 7d, 30d
      userLocation, // { lat, lng, city, subregion, region }
      scope = "City Wide", // Current Area, City Wide, Regional
    } = req.query;

    // Calculate time range
    const now = new Date();
    const timeRanges = {
      "24h": new Date(now.getTime() - 24 * 60 * 60 * 1000),
      "7d": new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      "30d": new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    };

    const startTime = timeRanges[period];

    if (!startTime) {
      return res.status(400).json({ error: "Invalid period specified" });
    }

    // Build location filter
    let locationFilter = {};
    if (userLocation) {
      const location = JSON.parse(userLocation);

      switch (scope) {
        case "Current Area":
        case "City Wide":
          locationFilter = {
            "location.city": location.city,
          };
          break;
        case "Regional":
          locationFilter = {
            "location.region": location.region,
          };
          break;
      }
    }

    // Fetch feedback data
    let feedbackQuery = db
      .collection("feedback")
      .where("timestamp", ">=", startTime);

    const feedbackSnapshot = await feedbackQuery.get();

    // Fetch signal metrics data
    let signalQuery = db
      .collection("signalMetrics")
      .where("timestamp", ">=", startTime);

    const signalSnapshot = await signalQuery.get();

    // Process feedback issues
    const issueCategories = {
      "RF Coverage Issues": {
        keywords: [
          "signal",
          "coverage",
          "no service",
          "weak signal",
          "dropped calls",
        ],
        reportedIssues: ["signal_strength", "coverage", "no_signal"],
        reports: [],
        technicalIndicators: [],
      },
      "Throughput Degradation": {
        keywords: [
          "slow",
          "speed",
          "download",
          "upload",
          "bandwidth",
          "throughput",
        ],
        reportedIssues: ["slow_data", "speed_issues", "bandwidth"],
        reports: [],
        technicalIndicators: [],
      },
      "Voice Quality Issues": {
        keywords: [
          "call quality",
          "voice",
          "audio",
          "echo",
          "garbled",
          "choppy",
        ],
        reportedIssues: ["call_quality", "voice_issues", "audio_problems"],
        reports: [],
        technicalIndicators: [],
      },
      "Latency Issues": {
        keywords: ["lag", "delay", "latency", "slow response"],
        reportedIssues: ["high_latency", "lag", "delay"],
        reports: [],
        technicalIndicators: [],
      },
      "Handover Issues": {
        keywords: [
          "handover",
          "switching",
          "connection drop",
          "network switch",
        ],
        reportedIssues: ["handover", "connection_drops", "network_switching"],
        reports: [],
        technicalIndicators: [],
      },
    };

    // Process feedback
    feedbackSnapshot.forEach((doc) => {
      const data = doc.data();

      // Apply location filter
      let location;
      if (typeof data.location === "string") {
        try {
          location = JSON.parse(data.location);
        } catch (e) {
          return;
        }
      } else {
        location = data.location;
      }

      if (!location) return;

      // Check location filter
      if (Object.keys(locationFilter).length > 0) {
        const shouldInclude = Object.entries(locationFilter).every(
          ([field, value]) => {
            const fieldPath = field.split(".");
            let fieldValue = location;
            for (const path of fieldPath.slice(1)) {
              fieldValue = fieldValue?.[path];
            }
            return fieldValue === value;
          }
        );

        if (!shouldInclude) return;
      }

      // Categorize issues
      const comment = (data.comment || "").toLowerCase();
      const issueTypes = data.issue_type || [];

      Object.keys(issueCategories).forEach((category) => {
        const categoryData = issueCategories[category];

        // Check keywords in comments
        const hasKeyword = categoryData.keywords.some((keyword) =>
          comment.includes(keyword.toLowerCase())
        );

        // Check reported issue types
        const hasReportedIssue = issueTypes.some((issue) =>
          categoryData.reportedIssues.includes(issue)
        );

        if (hasKeyword || hasReportedIssue) {
          categoryData.reports.push({
            id: doc.id,
            rating: data.rating,
            timestamp: data.timestamp.toDate(),
            location: location,
          });
        }
      });
    });

    // Process signal metrics for technical indicators
    signalSnapshot.forEach((doc) => {
      const data = doc.data();

      // Apply location filter
      let location;
      if (typeof data.location === "string") {
        try {
          location = JSON.parse(data.location);
        } catch (e) {
          return;
        }
      } else {
        location = data.location;
      }

      if (!location) return;

      // Check location filter
      if (Object.keys(locationFilter).length > 0) {
        const shouldInclude = Object.entries(locationFilter).every(
          ([field, value]) => {
            const fieldPath = field.split(".");
            let fieldValue = location;
            for (const path of fieldPath.slice(1)) {
              fieldValue = fieldValue?.[path];
            }
            return fieldValue === value;
          }
        );

        if (!shouldInclude) return;
      }

      // Add technical indicators
      const signalStrength = parseFloat(data.signal_strength);
      const dataSpeed = parseFloat(data.data_speed);
      const latency = parseFloat(data.latency);

      if (signalStrength && signalStrength < -100) {
        issueCategories["RF Coverage Issues"].technicalIndicators.push(data);
      }

      if (dataSpeed && dataSpeed < 5) {
        issueCategories["Throughput Degradation"].technicalIndicators.push(
          data
        );
      }

      if (latency && latency > 200) {
        issueCategories["Latency Issues"].technicalIndicators.push(data);
      }
    });

    // Generate analysis results
    const issues = [];

    Object.entries(issueCategories).forEach(([issueType, data]) => {
      const totalReports =
        data.reports.length + data.technicalIndicators.length;

      if (totalReports > 0) {
        // Calculate priority based on report count and severity
        const priority = calculateIssuePriority(totalReports, data.reports);

        issues.push({
          issueType,
          reportCount: totalReports,
          userReports: data.reports.length,
          technicalIndicators: data.technicalIndicators.length,
          priority,
          icon: getIssueIcon(issueType),
          lastReported:
            data.reports.length > 0
              ? Math.max(...data.reports.map((r) => r.timestamp.getTime()))
              : null,
        });
      }
    });

    // Sort by priority (High -> Medium -> Low) and report count
    const priorityOrder = { High: 3, Medium: 2, Low: 1 };
    issues.sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return b.reportCount - a.reportCount;
    });

    res.json({
      success: true,
      period,
      scope,
      analysisTime: new Date().toISOString(),
      issues: issues.slice(0, 10), // Limit to top 10 issues
      summary: {
        totalIssueTypes: issues.length,
        totalReports: issues.reduce((sum, issue) => sum + issue.reportCount, 0),
        highPriorityIssues: issues.filter((i) => i.priority === "High").length,
      },
    });
  } catch (error) {
    console.error("Network Issues Analysis Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to perform network issues analysis",
      details: error.message,
    });
  }
});

// Helper Functions

function getFeedbackEmoji(rating, issueTypes) {
  if (rating >= 4) return "😊";
  if (rating >= 3) return "😐";
  if (rating >= 2) return "😕";
  if (rating >= 1) return "😞";

  // If no rating, determine by issue severity
  if (issueTypes && issueTypes.length > 0) {
    const severeIssues = ["no_signal", "call_quality", "connection_drops"];
    const hasSevereIssue = issueTypes.some((issue) =>
      severeIssues.includes(issue)
    );
    return hasSevereIssue ? "😞" : "😕";
  }

  return "😐";
}

function getAreaName(location) {
  if (location.city && location.subregion) {
    return location.city;
  }
  if (location.city) {
    return location.city;
  }
  if (location.subregion) {
    return location.subregion;
  }
  return "Unknown Area";
}

function extractNetworkType(feedbackData) {
  // Try to extract from context or associated data
  if (feedbackData.network_type) {
    return feedbackData.network_type;
  }

  // If not available, you might need to look up associated signal data
  // For now, return a default
  return "LTE"; // Default assumption
}

function getPrimaryIssue(issueTypes, comment) {
  if (issueTypes && issueTypes.length > 0) {
    // Return the first/primary issue type
    const issueMap = {
      signal_strength: "Poor signal",
      slow_data: "Slow speeds",
      call_quality: "Call quality",
      high_latency: "High latency",
      coverage: "Coverage issues",
      handover: "Connection drops",
    };

    return issueMap[issueTypes[0]] || issueTypes[0];
  }

  // Try to extract from comment
  if (comment) {
    const lowerComment = comment.toLowerCase();
    if (lowerComment.includes("slow")) return "Slow speeds";
    if (lowerComment.includes("call")) return "Call quality";
    if (lowerComment.includes("signal")) return "Poor signal";
    if (lowerComment.includes("coverage")) return "Coverage issues";
  }

  return null;
}

function calculateIssuePriority(reportCount, userReports) {
  // Calculate average rating to understand severity
  const avgRating =
    userReports.length > 0
      ? userReports.reduce((sum, r) => sum + (r.rating || 1), 0) /
        userReports.length
      : 1;

  // High priority: Many reports OR very low ratings
  if (reportCount >= 20 || avgRating < 2) {
    return "High";
  }

  // Medium priority: Moderate reports OR low ratings
  if (reportCount >= 10 || avgRating < 3) {
    return "Medium";
  }

  // Low priority: Few reports with decent ratings
  return "Low";
}

function getIssueIcon(issueType) {
  const iconMap = {
    "RF Coverage Issues": "signal",
    "Throughput Degradation": "speed",
    "Voice Quality Issues": "phone",
    "Latency Issues": "timer",
    "Handover Issues": "refresh",
  };

  return iconMap[issueType] || "alert";
}

export default router;
