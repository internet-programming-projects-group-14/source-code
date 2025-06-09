// backend/index.mjs or if using "type": "module" in package.json
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import analyticsRouter from "./routes/analytics.mjs";
import { generateUserId, generateSessionId } from "./lib/helper.mjs";
import admin from "./firebase.mjs";

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

//Moute route module
app.use("/analytics", analyticsRouter);

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
