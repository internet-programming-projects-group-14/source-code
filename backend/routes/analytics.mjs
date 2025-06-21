import { Router } from "express";
import { db, admin } from "../firebase.mjs";

const router = Router();

// Helper function to categorize signal quality
function categorizeSignalQuality(signalValues) {
  if (signalValues.length === 0) {
    return {
      excellent: 0,
      good: 0,
      fair: 0,
      poor: 0,
    };
  }

  let excellent = 0; // > -70 dBm
  let good = 0; // -70 to -85 dBm
  let fair = 0; // -85 to -100 dBm
  let poor = 0; // < -100 dBm

  signalValues.forEach((signal) => {
    if (signal > -70) {
      excellent++;
    } else if (signal > -85) {
      good++;
    } else if (signal > -100) {
      fair++;
    } else {
      poor++;
    }
  });

  const total = signalValues.length;

  return {
    excellent: parseFloat(((excellent / total) * 100).toFixed(1)),
    good: parseFloat(((good / total) * 100).toFixed(1)),
    fair: parseFloat(((fair / total) * 100).toFixed(1)),
    poor: parseFloat(((poor / total) * 100).toFixed(1)),
    counts: { excellent, good, fair, poor, total },
  };
}

// quality of experience analystics
router.get("/qoe", async (req, res) => {
  try {
    const { period = "24H", userId } = req.query;

    if (!userId) {
      throw new Error("No user id found");
    }

    // Calculate time ranges based on period
    const now = new Date();
    let startTime, previousPeriodStart;

    switch (period) {
      case "24H":
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        previousPeriodStart = new Date(
          startTime.getTime() - 24 * 60 * 60 * 1000
        );
        break;
      case "7D":
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        previousPeriodStart = new Date(
          startTime.getTime() - 7 * 24 * 60 * 60 * 1000
        );
        break;
      case "30D":
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        previousPeriodStart = new Date(
          startTime.getTime() - 30 * 24 * 60 * 60 * 1000
        );
        break;
      case "90D":
        startTime = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        previousPeriodStart = new Date(
          startTime.getTime() - 90 * 24 * 60 * 60 * 1000
        );
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        previousPeriodStart = new Date(
          startTime.getTime() - 24 * 60 * 60 * 1000
        );
    }

    // Build query conditions
    let query = db
      .collection("feedback")
      .where("timestamp", ">=", admin.firestore.Timestamp.fromDate(startTime))
      .where("timestamp", "<=", admin.firestore.Timestamp.fromDate(now));

    let previousQuery = db
      .collection("feedback")
      .where(
        "timestamp",
        ">=",
        admin.firestore.Timestamp.fromDate(previousPeriodStart)
      )
      .where("timestamp", "<", admin.firestore.Timestamp.fromDate(startTime));

    query = query.where("user_id", "==", userId);
    previousQuery = previousQuery.where("user_id", "==", userId);

    // Execute queries
    const [currentSnapshot, previousSnapshot] = await Promise.all([
      query.get(),
      previousQuery.get(),
    ]);

    // Process current period data
    const currentRatings = [];
    const hourlyData = {}; // For trends chart

    currentSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.rating && typeof data.rating === "number") {
        currentRatings.push(data.rating);

        // Group by hour for trends (for 24H period) or by day for longer periods
        const timestamp = data.timestamp.toDate();
        let timeKey;

        if (period === "24H") {
          timeKey = timestamp.getHours();
        } else {
          timeKey = timestamp.toISOString().split("T")[0]; // YYYY-MM-DD
        }

        if (!hourlyData[timeKey]) {
          hourlyData[timeKey] = [];
        }
        hourlyData[timeKey].push(data.rating);
      }
    });

    // Process previous period data for comparison
    const previousRatings = [];
    previousSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.rating && typeof data.rating === "number") {
        previousRatings.push(data.rating);
      }
    });

    // Calculate metrics
    const totalMeasurements = currentRatings.length;
    const averageQoE =
      currentRatings.length > 0
        ? parseFloat(
            (
              currentRatings.reduce((sum, rating) => sum + rating, 0) /
              currentRatings.length
            ).toFixed(1)
          )
        : 0;

    const previousAverageQoE =
      previousRatings.length > 0
        ? previousRatings.reduce((sum, rating) => sum + rating, 0) /
          previousRatings.length
        : 0;

    // Calculate percentage change
    let percentageChange = 0;
    if (previousAverageQoE > 0) {
      percentageChange = parseFloat(
        (
          ((averageQoE - previousAverageQoE) / previousAverageQoE) *
          100
        ).toFixed(1)
      );
    }

    // Find peak and lowest performance
    const peakPerformance =
      currentRatings.length > 0 ? Math.max(...currentRatings) : 0;
    const lowestPerformance =
      currentRatings.length > 0 ? Math.min(...currentRatings) : 0;

    // Calculate variance
    let variance = 0;
    if (currentRatings.length > 1) {
      const mean = averageQoE;
      const squaredDifferences = currentRatings.map((rating) =>
        Math.pow(rating - mean, 2)
      );
      variance = parseFloat(
        (
          squaredDifferences.reduce((sum, diff) => sum + diff, 0) /
          currentRatings.length
        ).toFixed(1)
      );
    }

    // Prepare trends data
    const trendsData = [];
    const maxRating = Math.max(...Object.values(hourlyData).flat(), 0);
    const minRating = Math.min(...Object.values(hourlyData).flat(), 5);

    if (period === "24H") {
      // For 24H, show hourly data
      for (let hour = 0; hour < 24; hour++) {
        const ratings = hourlyData[hour] || [];
        const avgRating =
          ratings.length > 0
            ? parseFloat(
                (
                  ratings.reduce((sum, r) => sum + r, 0) / ratings.length
                ).toFixed(1)
              )
            : 0;

        trendsData.push({
          time: `${hour}:00`,
          value: avgRating,
          hour: hour,
        });
      }
    } else {
      // For longer periods, show daily averages
      const sortedDays = Object.keys(hourlyData).sort();
      sortedDays.forEach((day) => {
        const ratings = hourlyData[day];
        const avgRating =
          ratings.length > 0
            ? parseFloat(
                (
                  ratings.reduce((sum, r) => sum + r, 0) / ratings.length
                ).toFixed(1)
              )
            : 0;

        trendsData.push({
          time: day,
          value: avgRating,
        });
      });
    }

    // Response data matching your app interface
    const response = {
      success: true,
      data: {
        userId,
        period,
        performanceOverview: {
          averageQoEScore: averageQoE,
          percentageChange: percentageChange,
          dataPoints: totalMeasurements,
        },
        performanceSummary: {
          peakPerformance: parseFloat(peakPerformance.toFixed(1)),
          lowestPerformance: parseFloat(lowestPerformance.toFixed(1)),
          variance: variance,
          trend: percentageChange,
        },
        trends: {
          data: trendsData,
          max: parseFloat(maxRating.toFixed(1)),
          min: parseFloat(minRating.toFixed(1)),
        },
        metadata: {
          totalMeasurements,
          periodStart: startTime.toISOString(),
          periodEnd: now.toISOString(),
          comparisonPeriodStart: previousPeriodStart.toISOString(),
          comparisonPeriodEnd: startTime.toISOString(),
        },
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching QoE analytics:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to fetch QoE analytics data",
    });
  }
});

// Signal strength analytics

router.get("/rf-quality", async (req, res) => {
  try {
    const { period = "24H", userId } = req.query;

    if (!userId) {
      throw new Error("No user id found");
    }

    // Calculate time ranges based on period
    const now = new Date();
    let startTime, previousPeriodStart;

    switch (period) {
      case "24H":
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        previousPeriodStart = new Date(
          startTime.getTime() - 24 * 60 * 60 * 1000
        );
        break;
      case "7D":
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        previousPeriodStart = new Date(
          startTime.getTime() - 7 * 24 * 60 * 60 * 1000
        );
        break;
      case "30D":
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        previousPeriodStart = new Date(
          startTime.getTime() - 30 * 24 * 60 * 60 * 1000
        );
        break;
      case "90D":
        startTime = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        previousPeriodStart = new Date(
          startTime.getTime() - 90 * 24 * 60 * 60 * 1000
        );
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        previousPeriodStart = new Date(
          startTime.getTime() - 24 * 60 * 60 * 1000
        );
    }

    // Build query conditions for signalMetrics collection
    let query = db
      .collection("signalMetrics")
      .where("timestamp", ">=", admin.firestore.Timestamp.fromDate(startTime))
      .where("timestamp", "<=", admin.firestore.Timestamp.fromDate(now));

    let previousQuery = db
      .collection("signalMetrics")
      .where(
        "timestamp",
        ">=",
        admin.firestore.Timestamp.fromDate(previousPeriodStart)
      )
      .where("timestamp", "<", admin.firestore.Timestamp.fromDate(startTime));

    query = query.where("user_id", "==", userId);
    previousQuery = previousQuery.where("user_id", "==", userId);

    // Execute queries
    const [currentSnapshot, previousSnapshot] = await Promise.all([
      query.get(),
      previousQuery.get(),
    ]);

    // Helper function to parse signal strength values
    const parseSignalStrength = (signalStr) => {
      if (typeof signalStr === "number") return signalStr;
      if (typeof signalStr === "string") {
        // Remove 'dBm' suffix and convert to number
        const parsed = parseFloat(signalStr.replace(/dBm?/i, "").trim());
        return isNaN(parsed) ? null : parsed;
      }
      return null;
    };

    // Process current period data
    const currentSignalValues = [];
    const timeSeriesData = {}; // For trends chart

    currentSnapshot.forEach((doc) => {
      const data = doc.data();
      const signalStrength = parseSignalStrength(data.signal_strength);

      if (signalStrength !== null) {
        currentSignalValues.push(signalStrength);

        // Group by time intervals for trends
        const timestamp = data.timestamp.toDate();
        let timeKey;

        if (period === "24H") {
          timeKey = timestamp.getHours();
        } else if (period === "7D") {
          timeKey = Math.floor(
            (timestamp.getTime() - startTime.getTime()) / (24 * 60 * 60 * 1000)
          ); // Day index
        } else {
          timeKey = timestamp.toISOString().split("T")[0]; // YYYY-MM-DD
        }

        if (!timeSeriesData[timeKey]) {
          timeSeriesData[timeKey] = [];
        }
        timeSeriesData[timeKey].push(signalStrength);
      }
    });

    // Process previous period data for comparison
    const previousSignalValues = [];
    previousSnapshot.forEach((doc) => {
      const data = doc.data();
      const signalStrength = parseSignalStrength(data.signal_strength);
      if (signalStrength !== null) {
        previousSignalValues.push(signalStrength);
      }
    });

    // Calculate RF Quality metrics
    const totalMeasurements = currentSignalValues.length;

    // Average RF Quality (signal strength in dBm - higher is better, but values are negative)
    const averageRFQuality =
      currentSignalValues.length > 0
        ? parseFloat(
            (
              currentSignalValues.reduce((sum, signal) => sum + signal, 0) /
              currentSignalValues.length
            ).toFixed(1)
          )
        : 0;

    const previousAverageRF =
      previousSignalValues.length > 0
        ? previousSignalValues.reduce((sum, signal) => sum + signal, 0) /
          previousSignalValues.length
        : 0;

    // Calculate percentage change
    let percentageChange = 0;
    if (previousAverageRF !== 0) {
      percentageChange = parseFloat(
        (
          ((averageRFQuality - previousAverageRF) /
            Math.abs(previousAverageRF)) *
          100
        ).toFixed(1)
      );
    }

    // Find peak and lowest performance (for dBm, higher values are better)
    const peakPerformance =
      currentSignalValues.length > 0 ? Math.max(...currentSignalValues) : 0;
    const lowestPerformance =
      currentSignalValues.length > 0 ? Math.min(...currentSignalValues) : 0;

    // Calculate variance (range)
    const variance =
      currentSignalValues.length > 0
        ? parseFloat((peakPerformance - lowestPerformance).toFixed(1))
        : 0;

    // Prepare trends data
    const trendsData = [];

    if (period === "24H") {
      // For 24H, show hourly data
      for (let hour = 0; hour < 24; hour++) {
        const signals = timeSeriesData[hour] || [];
        const avgSignal =
          signals.length > 0
            ? parseFloat(
                (
                  signals.reduce((sum, s) => sum + s, 0) / signals.length
                ).toFixed(1)
              )
            : null;

        trendsData.push({
          time: `${hour}:00`,
          value: avgSignal,
          hour: hour,
        });
      }
    } else if (period === "7D") {
      // For 7D, show daily data
      for (let day = 0; day < 7; day++) {
        const signals = timeSeriesData[day] || [];
        const avgSignal =
          signals.length > 0
            ? parseFloat(
                (
                  signals.reduce((sum, s) => sum + s, 0) / signals.length
                ).toFixed(1)
              )
            : null;

        const date = new Date(startTime.getTime() + day * 24 * 60 * 60 * 1000);
        trendsData.push({
          time: date.toISOString().split("T")[0],
          value: avgSignal,
          day: day,
        });
      }
    } else {
      // For longer periods, show aggregated data
      const sortedDays = Object.keys(timeSeriesData).sort();
      sortedDays.forEach((day) => {
        const signals = timeSeriesData[day];
        const avgSignal =
          signals.length > 0
            ? parseFloat(
                (
                  signals.reduce((sum, s) => sum + s, 0) / signals.length
                ).toFixed(1)
              )
            : null;

        trendsData.push({
          time: day,
          value: avgSignal,
        });
      });
    }

    // Get min/max for chart scaling
    const validValues = trendsData
      .filter((d) => d.value !== null)
      .map((d) => d.value);
    const chartMax = validValues.length > 0 ? Math.max(...validValues) : 0;
    const chartMin = validValues.length > 0 ? Math.min(...validValues) : -100;

    // Response data matching your app interface
    const response = {
      success: true,
      data: {
        period,
        performanceOverview: {
          averageRFQuality: averageRFQuality,
          percentageChange: percentageChange,
          dataPoints: totalMeasurements,
          unit: "dBm",
        },
        performanceSummary: {
          peakPerformance: parseFloat(peakPerformance.toFixed(1)),
          lowestPerformance: parseFloat(lowestPerformance.toFixed(1)),
          variance: variance,
          trend: percentageChange,
          unit: "dBm",
        },
        trends: {
          data: trendsData,
          max: parseFloat(chartMax.toFixed(1)),
          min: parseFloat(chartMin.toFixed(1)),
          unit: "dBm",
        },
        signalQualityCategories: categorizeSignalQuality(currentSignalValues),
        metadata: {
          totalMeasurements,
          periodStart: startTime.toISOString(),
          periodEnd: now.toISOString(),
          comparisonPeriodStart: previousPeriodStart.toISOString(),
          comparisonPeriodEnd: startTime.toISOString(),
        },
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching RF Quality analytics:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to fetch RF Quality analytics data",
    });
  }
});

// Helper function to categorize latency quality
function categorizeLatencyQuality(latencyValues) {
  if (latencyValues.length === 0) {
    return {
      excellent: 0,
      good: 0,
      fair: 0,
      poor: 0,
    };
  }

  let excellent = 0; // < 20ms
  let good = 0; // 20-50ms
  let fair = 0; // 50-100ms
  let poor = 0; // > 100ms

  latencyValues.forEach((latency) => {
    if (latency < 20) {
      excellent++;
    } else if (latency < 50) {
      good++;
    } else if (latency < 100) {
      fair++;
    } else {
      poor++;
    }
  });

  const total = latencyValues.length;

  return {
    excellent: parseFloat(((excellent / total) * 100).toFixed(1)),
    good: parseFloat(((good / total) * 100).toFixed(1)),
    fair: parseFloat(((fair / total) * 100).toFixed(1)),
    poor: parseFloat(((poor / total) * 100).toFixed(1)),
    counts: { excellent, good, fair, poor, total },
  };
}

// Latency analytics

router.get("/latency", async (req, res) => {
  try {
    const { period = "24H", userId } = req.query;

    if (!userId) {
      throw new Error("No user id found");
    }

    // Calculate time ranges based on period
    const now = new Date();
    let startTime, previousPeriodStart;

    switch (period) {
      case "24H":
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        previousPeriodStart = new Date(
          startTime.getTime() - 24 * 60 * 60 * 1000
        );
        break;
      case "7D":
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        previousPeriodStart = new Date(
          startTime.getTime() - 7 * 24 * 60 * 60 * 1000
        );
        break;
      case "30D":
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        previousPeriodStart = new Date(
          startTime.getTime() - 30 * 24 * 60 * 60 * 1000
        );
        break;
      case "90D":
        startTime = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        previousPeriodStart = new Date(
          startTime.getTime() - 90 * 24 * 60 * 60 * 1000
        );
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        previousPeriodStart = new Date(
          startTime.getTime() - 24 * 60 * 60 * 1000
        );
    }

    // Build query conditions for signalMetrics collection
    let query = db
      .collection("signalMetrics")
      .where("timestamp", ">=", admin.firestore.Timestamp.fromDate(startTime))
      .where("timestamp", "<=", admin.firestore.Timestamp.fromDate(now));

    let previousQuery = db
      .collection("signalMetrics")
      .where(
        "timestamp",
        ">=",
        admin.firestore.Timestamp.fromDate(previousPeriodStart)
      )
      .where("timestamp", "<", admin.firestore.Timestamp.fromDate(startTime));

    query = query.where("user_id", "==", userId);
    previousQuery = previousQuery.where("user_id", "==", userId);

    // Execute queries
    const [currentSnapshot, previousSnapshot] = await Promise.all([
      query.get(),
      previousQuery.get(),
    ]);

    // Helper function to parse latency values
    const parseLatency = (latencyStr) => {
      if (typeof latencyStr === "number") return latencyStr;
      if (typeof latencyStr === "string") {
        // Handle various formats: "23ms", "23 ms", "23", "Unknown"
        if (latencyStr.toLowerCase() === "unknown") return null;
        const parsed = parseFloat(latencyStr.replace(/ms?/i, "").trim());
        return isNaN(parsed) ? null : parsed;
      }
      return null;
    };

    // Process current period data
    const currentLatencyValues = [];
    const timeSeriesData = {}; // For trends chart

    currentSnapshot.forEach((doc) => {
      const data = doc.data();
      const latency = parseLatency(data.latency);

      if (latency !== null) {
        currentLatencyValues.push(latency);

        // Group by time intervals for trends
        const timestamp = data.timestamp.toDate();
        let timeKey;

        if (period === "24H") {
          timeKey = timestamp.getHours();
        } else if (period === "7D") {
          timeKey = Math.floor(
            (timestamp.getTime() - startTime.getTime()) / (24 * 60 * 60 * 1000)
          ); // Day index
        } else {
          timeKey = timestamp.toISOString().split("T")[0]; // YYYY-MM-DD
        }

        if (!timeSeriesData[timeKey]) {
          timeSeriesData[timeKey] = [];
        }
        timeSeriesData[timeKey].push(latency);
      }
    });

    // Process previous period data for comparison
    const previousLatencyValues = [];
    previousSnapshot.forEach((doc) => {
      const data = doc.data();
      const latency = parseLatency(data.latency);
      if (latency !== null) {
        previousLatencyValues.push(latency);
      }
    });

    // Calculate Latency metrics
    const totalMeasurements = currentLatencyValues.length;

    // Average Latency (lower is better)
    const averageLatency =
      currentLatencyValues.length > 0
        ? parseFloat(
            (
              currentLatencyValues.reduce((sum, latency) => sum + latency, 0) /
              currentLatencyValues.length
            ).toFixed(1)
          )
        : 0;

    const previousAverageLatency =
      previousLatencyValues.length > 0
        ? previousLatencyValues.reduce((sum, latency) => sum + latency, 0) /
          previousLatencyValues.length
        : 0;

    // Calculate percentage change (for latency, negative change is good)
    let percentageChange = 0;
    if (previousAverageLatency > 0) {
      percentageChange = parseFloat(
        (
          ((averageLatency - previousAverageLatency) / previousAverageLatency) *
          100
        ).toFixed(1)
      );
    }

    // Find peak (worst) and lowest (best) performance
    const peakLatency =
      currentLatencyValues.length > 0 ? Math.max(...currentLatencyValues) : 0; // Worst performance
    const lowestLatency =
      currentLatencyValues.length > 0 ? Math.min(...currentLatencyValues) : 0; // Best performance

    // Calculate variance (range)
    const variance =
      currentLatencyValues.length > 0
        ? parseFloat((peakLatency - lowestLatency).toFixed(1))
        : 0;

    // Prepare trends data
    const trendsData = [];

    if (period === "24H") {
      // For 24H, show hourly data
      for (let hour = 0; hour < 24; hour++) {
        const latencies = timeSeriesData[hour] || [];
        const avgLatency =
          latencies.length > 0
            ? parseFloat(
                (
                  latencies.reduce((sum, l) => sum + l, 0) / latencies.length
                ).toFixed(1)
              )
            : null;

        trendsData.push({
          time: `${hour}:00`,
          value: avgLatency,
          hour: hour,
        });
      }
    } else if (period === "7D") {
      // For 7D, show daily data
      for (let day = 0; day < 7; day++) {
        const latencies = timeSeriesData[day] || [];
        const avgLatency =
          latencies.length > 0
            ? parseFloat(
                (
                  latencies.reduce((sum, l) => sum + l, 0) / latencies.length
                ).toFixed(1)
              )
            : null;

        const date = new Date(startTime.getTime() + day * 24 * 60 * 60 * 1000);
        trendsData.push({
          time: date.toISOString().split("T")[0],
          value: avgLatency,
          day: day,
        });
      }
    } else {
      // For longer periods, show aggregated data
      const sortedDays = Object.keys(timeSeriesData).sort();
      sortedDays.forEach((day) => {
        const latencies = timeSeriesData[day];
        const avgLatency =
          latencies.length > 0
            ? parseFloat(
                (
                  latencies.reduce((sum, l) => sum + l, 0) / latencies.length
                ).toFixed(1)
              )
            : null;

        trendsData.push({
          time: day,
          value: avgLatency,
        });
      });
    }

    // Get min/max for chart scaling
    const validValues = trendsData
      .filter((d) => d.value !== null)
      .map((d) => d.value);
    const chartMax = validValues.length > 0 ? Math.max(...validValues) : 100;
    const chartMin = validValues.length > 0 ? Math.min(...validValues) : 0;

    // Response data matching your app interface
    const response = {
      success: true,
      data: {
        period,
        performanceOverview: {
          averageLatency: averageLatency,
          percentageChange: percentageChange,
          dataPoints: totalMeasurements,
          unit: "ms",
        },
        performanceSummary: {
          peakPerformance: parseFloat(peakLatency.toFixed(1)), // Highest latency (worst)
          lowestPerformance: parseFloat(lowestLatency.toFixed(1)), // Lowest latency (best)
          variance: variance,
          trend: percentageChange,
          unit: "ms",
        },
        trends: {
          data: trendsData,
          max: parseFloat(chartMax.toFixed(1)),
          min: parseFloat(chartMin.toFixed(1)),
          unit: "ms",
        },
        latencyQualityCategories:
          categorizeLatencyQuality(currentLatencyValues),
        metadata: {
          totalMeasurements,
          periodStart: startTime.toISOString(),
          periodEnd: now.toISOString(),
          comparisonPeriodStart: previousPeriodStart.toISOString(),
          comparisonPeriodEnd: startTime.toISOString(),
        },
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching Latency analytics:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to fetch Latency analytics data",
    });
  }
});

export default router;
