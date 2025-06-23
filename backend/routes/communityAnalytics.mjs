import { Router } from "express";
import { db, admin } from "../firebase.mjs";

const router = Router();

/**
 * Geographic QoE Analysis Endpoint
 * Analyzes network quality by geographic areas
 */
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

export default router;
