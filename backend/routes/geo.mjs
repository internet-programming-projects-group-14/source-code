// routes/geo.mjs
import { Router } from "express";
import { db, admin } from "../firebase.mjs";

const router = Router();

// GET /api/geo/coverage
router.get("/coverage", async (req, res) => {
  try {
    const { boundingBox, networkOperator, networkType, minSampleSize = 10 } = req.query;
    
    // Parse bounding box [minLng, minLat, maxLng, maxLat]
    const bbox = boundingBox ? boundingBox.split(",").map(Number) : null;
    
    // Calculate time range (last 7 days by default)
    const now = new Date();
    const startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    let query = db.collection("signalMetrics")
      .where("timestamp", ">=", admin.firestore.Timestamp.fromDate(startTime));

    // Apply filters
    if (networkOperator) {
      query = query.where("operator", "==", networkOperator);
    }
    
    if (networkType) {
      query = query.where("network_type", "==", networkType);
    }

    const snapshot = await query.get();
    const locations = [];
    const signalData = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.location && data.location.latitude && data.location.longitude) {
        // Check if within bounding box if provided
        if (!bbox || (
          data.location.longitude >= bbox[0] &&
          data.location.latitude >= bbox[1] &&
          data.location.longitude <= bbox[2] &&
          data.location.latitude <= bbox[3]
        )) {
          locations.push({
            lat: data.location.latitude,
            lng: data.location.longitude,
            signal: parseFloat(data.signal_strength) || 0
          });
          signalData.push(parseFloat(data.signal_strength) || 0);
        }
      }
    });

    // Group by geographic areas (simplified)
    const coverageAreas = groupByArea(locations, minSampleSize);
    
    res.json({
      data: coverageAreas,
      metadata: {
        totalSamples: locations.length,
        averageSignal: signalData.length > 0 
          ? signalData.reduce((a, b) => a + b, 0) / signalData.length 
          : 0,
        boundingBox: bbox,
        networkOperator,
        networkType
      }
    });
  } catch (error) {
    console.error("Error fetching coverage data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/geo/comparison
router.get("/comparison", async (req, res) => {
  try {
    const { boundingBox, operators, metric = "signal" } = req.query;
    
    if (!operators || operators.length === 0) {
      return res.status(400).json({ error: "At least one operator must be specified" });
    }
    
    const operatorList = operators.split(",");
    const bbox = boundingBox ? boundingBox.split(",").map(Number) : null;
    const now = new Date();
    const startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const results = await Promise.all(
      operatorList.map(async operator => {
        let query = db.collection("signalMetrics")
          .where("operator", "==", operator)
          .where("timestamp", ">=", admin.firestore.Timestamp.fromDate(startTime));

        const snapshot = await query.get();
        const metrics = [];
        
        snapshot.forEach(doc => {
          const data = doc.data();
          if (data.location && (!bbox || (
            data.location.longitude >= bbox[0] &&
            data.location.latitude >= bbox[1] &&
            data.location.longitude <= bbox[2] &&
            data.location.latitude <= bbox[3]
          ))) {
            metrics.push({
              signal: parseFloat(data.signal_strength) || 0,
              latency: parseFloat(data.latency) || 0,
              throughput: parseFloat(data.throughput) || 0
            });
          }
        });

        // Calculate averages
        const avgSignal = metrics.length > 0 
          ? metrics.reduce((sum, m) => sum + m.signal, 0) / metrics.length 
          : 0;
          
        const avgLatency = metrics.length > 0 
          ? metrics.reduce((sum, m) => sum + m.latency, 0) / metrics.length 
          : 0;
          
        const avgThroughput = metrics.length > 0 
          ? metrics.reduce((sum, m) => sum + m.throughput, 0) / metrics.length 
          : 0;

        return {
          operator,
          metrics: {
            signal: avgSignal,
            latency: avgLatency,
            throughput: avgThroughput,
            samples: metrics.length
          }
        };
      })
    );

    res.json({
      data: results,
      metadata: {
        boundingBox,
        metric,
        timeRange: {
          start: startTime.toISOString(),
          end: now.toISOString()
        }
      }
    });
  } catch (error) {
    console.error("Error in operator comparison:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Helper to group locations by area
function groupByArea(locations, minSamples) {
  // Simplified implementation - in production you'd use geohashing
  const areaSize = 0.1; // ~11km at equator
  const areas = {};
  
  locations.forEach(loc => {
    const latKey = Math.floor(loc.lat / areaSize) * areaSize;
    const lngKey = Math.floor(loc.lng / areaSize) * areaSize;
    const areaKey = `${latKey},${lngKey}`;
    
    if (!areas[areaKey]) {
      areas[areaKey] = {
        lat: latKey + areaSize/2,
        lng: lngKey + areaSize/2,
        signals: [],
        count: 0
      };
    }
    
    areas[areaKey].signals.push(loc.signal);
    areas[areaKey].count++;
  });
  
  // Filter areas with enough samples and calculate averages
  return Object.values(areas)
    .filter(area => area.count >= minSamples)
    .map(area => ({
      lat: area.lat,
      lng: area.lng,
      averageSignal: area.signals.reduce((a, b) => a + b, 0) / area.signals.length,
      samples: area.count
    }));
}

export default router;