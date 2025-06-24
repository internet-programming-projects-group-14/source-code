// Updated routes/operators.mjs
import { Router } from "express";
import { db, admin } from "../firebase.mjs";

const router = Router();

// Middleware to validate operator access
const validateOperator = (req, res, next) => {
  const operatorId = req.params.operatorId;
  if (!operatorId) {
    return res.status(400).json({
      error: "Operator ID is required",
    });
  }
  next();
};

// Helper function to get user sessions for an operator
async function getUserSessionsForOperator(operatorId, startTime, endTime) {
  const metricsQuery = db.collection("signalMetrics")
    .where("operator", "==", operatorId)
    .where("timestamp", ">=", startTime)
    .where("timestamp", "<=", endTime);
    
  const snapshot = await metricsQuery.get();
  
  // Get unique user sessions (user_id + approximate timestamp)
  const userSessions = new Set();
  snapshot.forEach(doc => {
    const data = doc.data();
    // Create a session key with user_id and rounded timestamp (to match feedback)
    const sessionKey = `${data.user_id}_${Math.floor(data.timestamp.seconds / 300)}`; // 5-minute windows
    userSessions.add({
      userId: data.user_id,
      sessionKey,
      timestamp: data.timestamp,
      operator: data.operator
    });
  });
  
  return Array.from(userSessions);
}

// Helper function to get feedback for specific users and time windows
async function getFeedbackForOperator(operatorId, startTime, endTime) {
  // First, get user sessions for this operator
  const userSessions = await getUserSessionsForOperator(operatorId, startTime, endTime);
  
  if (userSessions.length === 0) {
    return { empty: true, data: [] };
  }
  
  // Get unique user IDs
  const userIds = [...new Set(userSessions.map(session => session.userId))];
  
  // Query feedback for these users within the time range
  // Note: Firestore has a limit of 10 items in 'in' queries, so we might need to batch
  const feedbackPromises = [];
  
  for (let i = 0; i < userIds.length; i += 10) {
    const batch = userIds.slice(i, i + 10);
    const query = db.collection("feedback")
      .where("user_id", "in", batch)
      .where("timestamp", ">=", startTime)
      .where("timestamp", "<=", endTime);
    
    feedbackPromises.push(query.get());
  }
  
  const feedbackSnapshots = await Promise.all(feedbackPromises);
  
  // Combine all feedback documents
  const feedbackDocs = [];
  feedbackSnapshots.forEach(snapshot => {
    snapshot.forEach(doc => {
      feedbackDocs.push({
        id: doc.id,
        ...doc.data()
      });
    });
  });
  
  return { empty: false, data: feedbackDocs };
}

// Fixed dashboard endpoint
router.get("/:operatorId/dashboard", validateOperator, async (req, res) => {
  try {
    const { operatorId } = req.params;
    const { timeRange = "7D", region , city } = req.query;

    // Calculate time range
    const now = new Date();
    let startTime;
    
    switch (timeRange) {
      case "24H": startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
      case "7D": startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
      case "30D": startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
      default: startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const firestoreStartTime = admin.firestore.Timestamp.fromDate(startTime);
    const firestoreEndTime = admin.firestore.Timestamp.fromDate(now);

    // Get metrics directly (this works because signalMetrics has operator field)
    let metricsQuery = db.collection("signalMetrics")
      .where("operator", "==", operatorId)
      .where("timestamp", ">=", firestoreStartTime)
      .where("timestamp", "<=", firestoreEndTime);

    // Add region filter if provided
    if (region && region !== "all") {
      metricsQuery = metricsQuery.where("location.region", "==", region);

      //city filter
      if (city && city !== "all" && region && region !== "all") {
        metricsQuery = metricsQuery.where("location.city", "==", city);
      }
    }

    // Get feedback through user correlation
    const [metricsSnapshot, feedbackResult] = await Promise.all([
      metricsQuery.get(),
      getFeedbackForOperator(operatorId, firestoreStartTime, firestoreEndTime)
    ]);

    // Process feedback data
    const ratings = [];
    const issues = {};
    
    if (!feedbackResult.empty) {
      feedbackResult.data.forEach(feedbackDoc => {
        if (feedbackDoc.rating) ratings.push(feedbackDoc.rating);
        
        if (feedbackDoc.issue_type && Array.isArray(feedbackDoc.issue_type)) {
          feedbackDoc.issue_type.forEach(issue => {
            issues[issue] = (issues[issue] || 0) + 1;
          });
        }
      });
    }

    // Process metrics data
    const signalStrengths = [];
    const latencies = [];
    const throughputs = [];
    
    metricsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.signal_strength && !isNaN(parseFloat(data.signal_strength))) {
        signalStrengths.push(parseFloat(data.signal_strength));
      }
      if (data.latency && data.latency !== "Unknown" && !isNaN(parseFloat(data.latency))) {
        latencies.push(parseFloat(data.latency));
      }
      if (data.throughput && data.throughput !== "Unknown" && !isNaN(parseFloat(data.throughput))) {
        throughputs.push(parseFloat(data.throughput));
      }
    });

    // Calculate averages
    const avgRating = ratings.length > 0 ? 
      ratings.reduce((sum, r) => sum + r, 0) / ratings.length : 0;
      
    const avgSignal = signalStrengths.length > 0 ?
      signalStrengths.reduce((sum, s) => sum + s, 0) / signalStrengths.length : 0;
      
    const avgLatency = latencies.length > 0 ?
      latencies.reduce((sum, l) => sum + l, 0) / latencies.length : 0;
      
    const avgThroughput = throughputs.length > 0 ?
      throughputs.reduce((sum, t) => sum + t, 0) / throughputs.length : 0;

    // Sort issues by frequency
    const sortedIssues = Object.entries(issues)
      .sort((a, b) => b[1] - a[1])
      .map(([issue, count]) => ({ 
        issue, 
        count,
        percentage: feedbackResult.data.length > 0 ? 
          parseFloat(((count / feedbackResult.data.length) * 100).toFixed(1)) : 0
      }));

    // Prepare response
    res.status(200).json({
      success: true,
      data: {
        operatorId,
        timeRange,
        region: region || "all",
        city: city || "all",
        metrics: {
          qoe: {
            averageRating: parseFloat(avgRating.toFixed(2)),
            totalRatings: ratings.length,
            ratingDistribution: {
              1: ratings.filter(r => r === 1).length,
              2: ratings.filter(r => r === 2).length,
              3: ratings.filter(r => r === 3).length,
              4: ratings.filter(r => r === 4).length,
              5: ratings.filter(r => r === 5).length,
            }
          },
          network: {
            averageSignalStrength: parseFloat(avgSignal.toFixed(2)),
            averageLatency: parseFloat(avgLatency.toFixed(2)),
            averageThroughput: parseFloat(avgThroughput.toFixed(2)),
            totalMeasurements: metricsSnapshot.size
          }
        },
        topIssues: sortedIssues.slice(0, 5),
        sampleSizes: {
          feedback: feedbackResult.data.length,
          metrics: metricsSnapshot.size
        }
      }
    });

  } catch (error) {
    console.error("Error in operator dashboard:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

export default router;