interface AnalyticsData {
  time: string;
  value: number;
  change: number;
  download: number;
  upload: number;
}

interface AnalyticsSummary {
  average: number;
  max: number;
  min: number;
  trend: number;
  totalDataPoints: number;
}

interface AnalyticsResponse {
  success: boolean;
  period: string;
  metric: string;
  data: AnalyticsData[];
  summary: AnalyticsSummary;
  generatedAt: string;
  error?: string;
}

interface SummaryResponse {
  success: boolean;
  meanQoE: string;
  qoeDelta: string;
  avgThroughput: string;
  totalDataPoints: number;
  weekOverWeek: string;
}

export class AnalyticsService {
  private baseUrl: string;

  constructor(baseUrl: string = "/api/analytics") {
    this.baseUrl = baseUrl;
  }

  async getAnalytics(
    period: string = "7d",
    metric: string = "qoe"
  ): Promise<AnalyticsResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}?period=${period}&metric=${metric}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching analytics:", error);
      throw new Error(`Failed to fetch analytics: ${error.message}`);
    }
  }

  async getSummary(): Promise<SummaryResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/summary`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching summary:", error);
      throw new Error(`Failed to fetch summary: ${error.message}`);
    }
  }
}
// Create service instance
