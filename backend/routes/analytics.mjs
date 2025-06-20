import { Router } from "express";
import { db, admin } from "../firebase.mjs";

const router = Router();

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
        qualityTrends: {
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

export default router;
