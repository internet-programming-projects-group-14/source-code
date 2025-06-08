// backend/index.mjs
import 'dotenv/config'; // This loads variables from .env into process.env
import express from "express";
import admin from "firebase-admin";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { generateUserId, generateSessionId } from "./lib/helper.mjs";

// Firebase configuration from environment variables
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
  universe_domain: "googleapis.com"
};

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

// Helper functions (moved up to avoid hoisting issues)
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

    const userId = feedback.userId || generateUserId();
    const sessionId = generateSessionId();
    const feedbackId = generateSubmissionId();
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

    // Update analytics
    await updateAnalytics(feedback);

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

    let query = db.collection("feedback"); // Fixed collection name

    // Apply filters
    if (startDate) {
      query = query.where("timestamp", ">=", admin.firestore.Timestamp.fromDate(new Date(startDate)));
    }
    if (endDate) {
      query = query.where("timestamp", "<=", admin.firestore.Timestamp.fromDate(new Date(endDate)));
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
      if (data.issue_type && Array.isArray(data.issue_type)) {
        data.issue_type.forEach((issue) => {
          analytics.commonIssues[issue] =
            (analytics.commonIssues[issue] || 0) + 1;
        });
      }
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

// Ping Google
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