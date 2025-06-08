// backend/index.mjs or if using "type": "module" in package.json
import express from "express";
import admin from "firebase-admin";
import cors from "cors";
import rateLimit from "express-rate-limit";
import serviceAccount from "./private-key-firebase.json" assert { type: "json" };
import { generateUserId, generateSessionId } from "./lib/helper.mjs";

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Initialize Firestore
const db = admin.firestore();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});

app.use("/api/", limiter);

// Validation middleware
const validateFeedback = (req, res, next) => {
  const { feedback, technicalData } = req.body;

  // Validate required fields
  if (!feedback || !feedback.rating || !feedback.contextInfo) {
    return res.status(400).json({
      error: "Missing required feedback data",
      required: ["feedback.rating", "feedback.contextInfo"],
    });
  }

  // Validate rating range
  if (feedback.rating < 1 || feedback.rating > 5) {
    return res.status(400).json({
      error: "Rating must be between 1 and 5",
    });
  }

  next();
};

// Main endpoint for submitting network feedback
app.post("/api/network-feedback", validateFeedback, async (req, res) => {
  try {
    const { feedback, technicalData, deviceInfo } = req.body;

    const userId = feedback.userId || generateUserId(); // or pull from auth
    const sessionId = generateSessionId();
    const feedbackId = generateSubmissionId(); // reuse your function
    const timestamp = admin.firestore.Timestamp.now();

    // Store user if not exists
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      await userRef.set({
        device_info: deviceInfo,
        language_preference: feedback.language || "en",
        permissions: feedback.permissions || [],
      });
    }

    // Store session
    const sessionRef = db.collection("sessions").doc(sessionId);
    await sessionRef.set({
      user_id: userId,
      start_time: timestamp,
      end_time: timestamp,
    });

    // Store feedback
    await db
      .collection("feedback")
      .doc(feedbackId)
      .set({
        feedback_id: feedbackId,
        user_id: userId,
        timestamp,
        rating: feedback.rating,
        issue_type: feedback.specificIssues?.map((i) => i.type) || [],
        comment: feedback.additionalDetails || "",
      });

    // Store signal metric
    if (technicalData) {
      await db.collection("signalMetrics").add({
        session_id: sessionId,
        timestamp,
        signal_strength: technicalData.signalStrength,
        network_type: technicalData.networkType,
        operator: technicalData.carrier,
        location: feedback.contextInfo?.location || "Unknown",
      });
    }

    // Store location data (if available)
    if (technicalData?.coordinates) {
      await db.collection("locationData").add({
        latitude: technicalData.coordinates.latitude,
        longitude: technicalData.coordinates.longitude,
        accuracy: technicalData.coordinates.accuracy,
        timestamp,
      });
    }

    res.status(201).json({
      success: true,
      feedbackId,
      sessionId,
      userId,
      message: "Feedback submitted and normalized successfully.",
    });
  } catch (error) {
    console.error("Error submitting network feedback:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error occurred",
    });
  }
});

// Get feedback analytics (optional endpoint for dashboard)
app.get("/api/network-feedback/analytics", async (req, res) => {
  try {
    const { startDate, endDate, location } = req.query;

    let query = db.collection("networkFeedback");

    // Apply filters
    if (startDate) {
      query = query.where("submissionTime", ">=", new Date(startDate));
    }
    if (endDate) {
      query = query.where("submissionTime", "<=", new Date(endDate));
    }
    if (location) {
      query = query.where("contextInfo.location", "==", location);
    }

    const snapshot = await query.limit(1000).get();

    const analytics = {
      totalSubmissions: snapshot.size,
      averageRating: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      commonIssues: {},
      locationStats: {},
      networkTypeStats: {},
    };

    let totalRating = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();

      // Rating statistics
      totalRating += data.rating;
      analytics.ratingDistribution[data.rating]++;

      // Issue frequency
      if (data.specificIssues) {
        data.specificIssues.forEach((issue) => {
          analytics.commonIssues[issue.type] =
            (analytics.commonIssues[issue.type] || 0) + 1;
        });
      }

      // Location statistics
      const location = data.contextInfo?.location || "Unknown";
      analytics.locationStats[location] =
        (analytics.locationStats[location] || 0) + 1;

      // Network type statistics
      const networkType = data.technicalMetrics?.networkType || "Unknown";
      analytics.networkTypeStats[networkType] =
        (analytics.networkTypeStats[networkType] || 0) + 1;
    });

    analytics.averageRating =
      snapshot.size > 0 ? (totalRating / snapshot.size).toFixed(2) : 0;

    res.json({
      success: true,
      analytics,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch analytics",
    });
  }
});

// Helper functions
function getRatingDescription(rating) {
  const descriptions = {
    1: "Poor Experience",
    2: "Fair Experience",
    3: "Average Experience",
    4: "Good Experience",
    5: "Excellent Experience",
  };
  return descriptions[rating] || "Unknown";
}

function generateSubmissionId() {
  return "fb_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
}

async function updateAnalytics(feedbackData) {
  try {
    const analyticsRef = db.collection("analytics").doc("networkFeedback");

    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(analyticsRef);

      if (doc.exists) {
        const data = doc.data();
        transaction.update(analyticsRef, {
          totalSubmissions: (data.totalSubmissions || 0) + 1,
          lastUpdated: admin.firestore.Timestamp.now(),
          [`ratingCount.${feedbackData.rating}`]:
            (data.ratingCount?.[feedbackData.rating] || 0) + 1,
        });
      } else {
        transaction.set(analyticsRef, {
          totalSubmissions: 1,
          lastUpdated: admin.firestore.Timestamp.now(),
          ratingCount: { [feedbackData.rating]: 1 },
        });
      }
    });
  } catch (error) {
    console.error("Error updating analytics:", error);
  }
}

//Ping Google
app.get("/ping-google", async (req, res) => {
  try {
    const response = await fetch("https://www.google.com", { method: "HEAD" });
    res.status(response.status).send("OK");
  } catch (err) {
    res.status(500).send("Ping failed");
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "Network Feedback API",
  });
});

// 404 handler

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);
  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Network Feedback API server running on port ${PORT}`);
});

export default app;
