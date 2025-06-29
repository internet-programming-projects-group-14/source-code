// networkMetrics
export type NetworkMetrics = {
  signalStrength: number | null;
  networkType: string | null;
  carrier: string | null;
  frequency: string | null;
  bandwidth: string | null;
  cellId: string | null;
  pci: number | null;

  dataSpeed: number | null; // Download Mbps
  uploadSpeed: number | null; // Upload Mbps
  latency: number | null; // Ping time (ms)
  isConnected: boolean | null;

  throughput?: any; // From NetInfo.details (type varies by platform)

  location: {
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
    city?: string | null;
    subRegion?: string | null;
    region?: string | null;
  } | null;

  device: {
    platform: string;
    model: string | null;
    osVersion: string | null;
    // appVersion: string | null;
  };
};

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  city?: string | null;
  subRegion?: string | null;
  region?: string | null;
}

export interface DeviceInfo {
  platform: string;
  model: string | null;
  osVersion: string | null;
}

// Analytics
export interface AnalyticsData {
  time: string;
  value: number;
  change: number;
  download: number;
  upload: number;
}

export interface AnalyticsSummary {
  average: number;
  max: number;
  min: number;
  trend: number;
  totalDataPoints: number;
}

export interface AnalyticsResponse {
  success: boolean;
  period: string;
  metric: string;
  data: AnalyticsData[];
  summary: AnalyticsSummary;
  generatedAt: string;
  error?: string;
}

export interface SummaryResponse {
  success: boolean;
  meanQoE: string;
  qoeDelta: string;
  avgThroughput: string;
  totalDataPoints: number;
  weekOverWeek: string;
}
export type QoEAnalyticsResponse = {
  success: boolean;
  data: {
    userId: string;
    period: string;
    performanceOverview: {
      averageScore: number;
      percentageChange: number;
      dataPoints: number;
    };
    performanceSummary: {
      peakPerformance: number;
      lowestPerformance: number;
      variance: number;
      trend: number;
    };
    trends: {
      data: {
        time: string; // ISO date string
        value: number;
        throughput?: number;
        download?: number;
        upload?: number;
      }[];
      max: number;
      min: number;
    };
    metadata: {
      totalMeasurements: number;
      periodStart: string; // ISO date string
      periodEnd: string; // ISO date string
      comparisonPeriodStart: string; // ISO date string
      comparisonPeriodEnd: string; // ISO date string
    };
  };
};
