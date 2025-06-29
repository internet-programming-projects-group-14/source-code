// backend/index.mjs
import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import analyticsRouter from "./routes/analytics.mjs";
import communityAnalyticsRouter from "./routes/communityAnalytics.mjs";
import feedbackRouter from "./routes/feedback.mjs";
import geoRouter from "./routes/geo.mjs";
import temporalRouter from "./routes/temporal.mjs";
import { db, admin } from "./firebase.mjs";
import operatorRouter from "./routes/operators.mjs";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";

const app = express();

app.set("trust proxy", 1);

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const swaggerDocument = YAML.load("./swagger.yaml");

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Welcome to our QoE backend",
  });
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use("/api/", limiter);

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
    const { userId, feedback, technicalData, deviceInfo } = req.body;

    const timestamp = admin.firestore.Timestamp.now();

    // Store user if not exists
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      // User does not exist, create a new document
      await userRef.set({
        createdAt: timestamp,
        lastFeedbackAt: timestamp,
      });
      console.log(`New user created: ${userId}`);
    } else {
      // User exists, just update the lastFeedbackAt timestamp
      await userRef.update({
        lastFeedbackAt: timestamp,
      });
      console.log(`User ${userId} lastFeedbackAt updated.`);
    }

    // Store feedback
    await db
      .collection("feedback")
      .doc()
      .set({
        user_id: userId,
        timestamp,
        rating: feedback.rating,
        situationContext: feedback.contextInfo.situationContext,
        issue_type: feedback.specificIssues?.map((i) => i.type) || [],
        comment: feedback.additionalDetails || "",

        //added
        // operator: technicalData?.carrier || "Unknown",
        // network_type: technicalData?.networkType || "Unknown",
        // location: feedback.contextInfo?.location || "Unknown"
      });

    // Store signal metric
    if (technicalData) {
      await db.collection("signalMetrics").add({
        user_id: userId,
        timestamp,
        signal_strength: technicalData.signalStrength,
        network_type: technicalData.networkType,
        operator: technicalData.carrier,
        frequency: technicalData.frequency || "Unknown",
        bandwidth: technicalData.bandwidth || "Unknown",
        cell_id: technicalData.cellId || "Unknown",
        pci: technicalData.pci || "Unknown",
        data_speed: technicalData.dataSpeed || "Unknown",
        upload_speed: technicalData.uploadSpeed || "Unknown",
        latency: technicalData.latency || "Unknown",
        throughput: technicalData.throughput || "Unknown",
        location: feedback.contextInfo?.location || "Unknown",
        device_info: deviceInfo,
      });
    }

    // Update analytics
    updateAnalytics(feedback);

    res.status(201).json({
      success: true,
      userId,
      message: "Feedback submitted and normalized successfully.",
    });
  } catch (error) {
    console.error("Error submitting network feedback:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

app.post("/api/background/network-feedback", async (req, res) => {
  try {
    const { userId, metrics } = req.body;

    // --- Validation: Ensure metrics is an array ---
    if (!Array.isArray(metrics)) {
      console.warn("Received metrics is not an array:", metrics);
      return res.status(400).json({
        success: false,
        error: "Invalid request: 'metrics' must be an array.",
      });
    }

    // --- Process each metric in the array ---
    const firestorePromises = metrics.map(async (metric) => {
      // Use the timestamp from the client metric
      const timestamp = admin.firestore.Timestamp.fromMillis(metric.timestamp);

      // Destructure fields from the *current single metric object*
      const {
        signalStrength,
        networkType,
        carrier,
        frequency,
        bandwidth,
        cellId,
        pci,
        throughput,
        latency,
        location,
        device,
        error: metricError, // Alias to avoid conflict with outer catch error
      } = metric;

      // Construct the document data for Firestore
      return db.collection("signalMetrics").add({
        user_id: userId,
        timestamp, // Use the client's timestamp
        signal_strength:
          signalStrength !== undefined && signalStrength !== null
            ? signalStrength // Keep 0 or null as valid values
            : "Unknown",
        network_type: networkType || "Unknown",
        operator: carrier || "Unknown",
        frequency: frequency || "Unknown",
        bandwidth: bandwidth || "Unknown",
        cell_id: cellId || "Unknown",
        pci: pci || "Unknown",
        throughput: throughput || "Unknown",
        latency:
          latency !== undefined && latency !== null
            ? latency // Keep 0 or null as valid values
            : "Unknown",
        location: location
          ? {
              latitude: location.latitude,
              longitude: location.longitude,
              accuracy:
                location.accuracy !== undefined && location.accuracy !== null
                  ? location.accuracy
                  : "Unknown",
            }
          : "Unknown", // If location is null from frontend
        device_info: {
          platform: device?.platform || "Unknown", // Use optional chaining
          model: device?.model || "Unknown",
          os_version: device?.osVersion || "Unknown",
        },
        // Include the error field if it exists in the metric object
        error: metricError || null,
      });
    });

    // Wait for all Firestore add operations to complete
    await Promise.all(firestorePromises);

    res.status(201).json({
      success: true,
      userId,
      message: `${metrics.length} network metrics submitted successfully.`,
    });
  } catch (error) {
    // This will catch errors during Firestore operations or invalid data processing
    console.error("Error submitting network metrics:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

//Mount route module
app.use("/api/analytics", analyticsRouter);
app.use("/api/community", communityAnalyticsRouter);
app.use("/api/operators", operatorRouter);
app.use("/api/feedback", feedbackRouter);
app.use("/api/geo", geoRouter);
app.use("/api/temporal", temporalRouter);

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

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Network Feedback API server running on port ${PORT}`);
});

export default app;
