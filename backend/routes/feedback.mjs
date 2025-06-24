// routes/feedback.mjs
import { Router } from "express";
import { db, admin } from "../firebase.mjs";

const router = Router();

// GET /api/feedback/ratings
router.get("/ratings", async (req, res) => {
  try {
    const { timeRange, location, networkOperator, ratingRange, issueType } = req.query;
    
    // Calculate time range
    const now = new Date();
    let startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Default 24h
    
    if (timeRange === "7D") startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (timeRange === "30D") startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Build base query
    let query = db.collection("feedback")
      .where("timestamp", ">=", admin.firestore.Timestamp.fromDate(startTime))
      .where("timestamp", "<=", admin.firestore.Timestamp.fromDate(now));

    // Apply filters
    if (networkOperator) {
      // Need to join with signalMetrics to filter by operator
      const metricsQuery = db.collection("signalMetrics")
        .where("operator", "==", networkOperator)
        .where("timestamp", ">=", admin.firestore.Timestamp.fromDate(startTime))
        .select("user_id");
      
      const metricsSnapshot = await metricsQuery.get();
      const userIds = metricsSnapshot.docs.map(doc => doc.data().user_id);
      
      if (userIds.length > 0) {
        query = query.where("user_id", "in", userIds.slice(0, 10)); // Firestore 'in' limit
      } else {
        return res.json({ data: [], metadata: { total: 0 } });
      }
    }

    if (ratingRange) {
      const [min, max] = ratingRange.split("-").map(Number);
      query = query.where("rating", ">=", min)
                  .where("rating", "<=", max);
    }

    if (issueType) {
      query = query.where("issue_type", "array-contains", issueType);
    }

    const snapshot = await query.get();
    const ratings = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      ratings.push({
        id: doc.id,
        rating: data.rating,
        timestamp: data.timestamp.toDate().toISOString(),
        userId: data.user_id,
        issues: data.issue_type || [],
        location: data.location || null
      });
    });

    res.json({
      data: ratings,
      metadata: {
        total: ratings.length,
        timeRange: {
          start: startTime.toISOString(),
          end: now.toISOString()
        },
        filters: {
          networkOperator,
          ratingRange,
          issueType
        }
      }
    });
  } catch (error) {
    console.error("Error fetching ratings:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/feedback/comments
router.get("/comments", async (req, res) => {
  try {
    const { timeRange, sentiment } = req.query;
    
    // Calculate time range
    const now = new Date();
    let startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Default 24h
    
    if (timeRange === "7D") startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (timeRange === "30D") startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let query = db.collection("feedback")
      .where("timestamp", ">=", admin.firestore.Timestamp.fromDate(startTime))
      .where("timestamp", "<=", admin.firestore.Timestamp.fromDate(now))
      .where("comment", "!=", "");

    const snapshot = await query.get();
    const comments = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.comment) {
        comments.push({
          id: doc.id,
          comment: data.comment,
          rating: data.rating,
          timestamp: data.timestamp.toDate().toISOString(),
          userId: data.user_id,
          sentiment: analyzeSentiment(data.comment) // Simple sentiment analysis
        });
      }
    });

    // Filter by sentiment if requested
    const filteredComments = sentiment 
      ? comments.filter(c => c.sentiment === sentiment)
      : comments;

    res.json({
      data: filteredComments,
      metadata: {
        total: filteredComments.length,
        timeRange: {
          start: startTime.toISOString(),
          end: now.toISOString()
        }
      }
    });
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Simple sentiment analysis helper
function analyzeSentiment(comment) {
  const positiveWords = ["good", "great", "excellent", "happy", "satisfied"];
  const negativeWords = ["bad", "poor", "terrible", "unhappy", "frustrated"];
  
  const lowerComment = comment.toLowerCase();
  const positive = positiveWords.some(word => lowerComment.includes(word));
  const negative = negativeWords.some(word => lowerComment.includes(word));
  
  if (positive && !negative) return "positive";
  if (negative && !positive) return "negative";
  return "neutral";
}

export default router;