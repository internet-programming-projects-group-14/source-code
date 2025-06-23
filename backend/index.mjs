// backend/index.mjs
import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import analyticsRouter from "./routes/analytics.mjs";
import { db, admin } from "./firebase.mjs";
import operatorRouter from "./routes/operators.mjs";

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

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Welcome to our QoE backend",
  });
});

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
      await userRef.set({
        permissions: feedback.permissions || [],
      });
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

//Mount route module
app.use("/api/analytics", analyticsRouter);
app.use("/api/operators", operatorRouter);

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
// After your existing app.use() calls, add:

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Network Feedback API server running on port ${PORT}`);
});

export default app;
