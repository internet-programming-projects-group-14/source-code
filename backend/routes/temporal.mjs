// routes/temporal.mjs
import { Router } from "express";
import { db, admin } from "../firebase.mjs";

const router = Router();

// GET /api/temporal/patterns
router.get("/patterns", async (req, res) => {
  try {
    const { timeRange = "7D", metric = "signal", networkOperator, location } = req.query;
    
    // Calculate time range
    const now = new Date();
    let startTime;
    
    switch (timeRange) {
      case "24H": startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
      case "7D": startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
      case "30D": startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
      default: startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    let query = db.collection("signalMetrics")
      .where("timestamp", ">=", admin.firestore.Timestamp.fromDate(startTime))
      .where("timestamp", "<=", admin.firestore.Timestamp.fromDate(now));

    if (networkOperator) {
      query = query.where("operator", "==", networkOperator);
    }

    if (location) {
      // Simplified location filter - in production use geohash
      const [lat, lng, radius] = location.split(",").map(Number);
      // This would need proper geospatial query implementation
    }

    const snapshot = await query.get();
    const hourlyData = Array(24).fill().map(() => ({ values: [], count: 0 }));
    const dailyData = Array(7).fill().map(() => ({ values: [], count: 0 }));

    snapshot.forEach(doc => {
      const data = doc.data();
      const timestamp = data.timestamp.toDate();
      const hour = timestamp.getHours();
      const day = timestamp.getDay(); // 0 (Sunday) to 6 (Saturday)
      
      let value;
      switch (metric) {
        case "signal": value = parseFloat(data.signal_strength); break;
        case "latency": value = parseFloat(data.latency); break;
        case "throughput": value = parseFloat(data.throughput); break;
        default: value = parseFloat(data.signal_strength);
      }
      
      if (!isNaN(value)) {
        hourlyData[hour].values.push(value);
        hourlyData[hour].count++;
        
        dailyData[day].values.push(value);
        dailyData[day].count++;
      }
    });

    // Calculate hourly patterns
    const hourlyPatterns = hourlyData.map((hour, idx) => ({
      hour: idx,
      average: hour.values.length > 0 
        ? hour.values.reduce((a, b) => a + b, 0) / hour.values.length 
        : 0,
      samples: hour.count
    }));

    // Calculate daily patterns
    const dailyPatterns = dailyData.map((day, idx) => ({
      day: idx,
      dayName: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][idx],
      average: day.values.length > 0 
        ? day.values.reduce((a, b) => a + b, 0) / day.values.length 
        : 0,
      samples: day.count
    }));

    res.json({
      success: true,
      data: {
        metric,
        timeRange,
        hourlyPatterns,
        dailyPatterns,
        metadata: {
          networkOperator,
          totalSamples: snapshot.size
        }
      }
    });
  } catch (error) {
    console.error("Error in temporal patterns analysis:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

export default router;