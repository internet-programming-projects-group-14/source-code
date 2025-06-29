// lib/offlineFeedbackManager.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import Constants from "expo-constants";

const OFFLINE_FEEDBACK_KEY = "offline_feedback_queue";
const SYNC_STATUS_KEY = "feedback_sync_status";

export interface OfflineFeedback {
  id: string;
  timestamp: number;
  requestBody: any;
  retryCount: number;
  status: "pending" | "syncing" | "failed" | "synced";
}

export interface SyncStatus {
  lastSyncAttempt: number;
  totalPending: number;
  totalFailed: number;
  isCurrentlySyncing: boolean;
}

class OfflineFeedbackManager {
  private apiUrl: string;
  private syncInProgress = false;
  private listeners: ((status: SyncStatus) => void)[] = [];

  constructor() {
    this.apiUrl = Constants.expoConfig?.extra?.API_URL || "";
    this.initializeNetworkListener();
  }

  // Initialize network state listener
  private initializeNetworkListener() {
    NetInfo.addEventListener((state) => {
      if (state.isConnected && !this.syncInProgress) {
        this.syncPendingFeedback();
      }
    });
  }

  // Add a listener for sync status updates
  addSyncStatusListener(listener: (status: SyncStatus) => void) {
    this.listeners.push(listener);
  }

  // Remove a sync status listener
  removeSyncStatusListener(listener: (status: SyncStatus) => void) {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  // Notify all listeners of sync status changes
  private notifyListeners(status: SyncStatus) {
    this.listeners.forEach((listener) => listener(status));
  }

  // Store feedback locally
  async storeFeedbackOffline(requestBody: any): Promise<string> {
    try {
      const feedbackId = `feedback_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const offlineFeedback: OfflineFeedback = {
        id: feedbackId,
        timestamp: Date.now(),
        requestBody,
        retryCount: 0,
        status: "pending",
      };

      // Get existing offline feedback
      const existingFeedback = await this.getOfflineFeedback();
      existingFeedback.push(offlineFeedback);

      // Store updated feedback list
      await AsyncStorage.setItem(
        OFFLINE_FEEDBACK_KEY,
        JSON.stringify(existingFeedback)
      );

      // Update sync status
      await this.updateSyncStatus();

      console.log(`Feedback stored offline with ID: ${feedbackId}`);
      return feedbackId;
    } catch (error) {
      console.error("Error storing feedback offline:", error);
      throw new Error("Failed to store feedback offline");
    }
  }

  // Get all offline feedback
  async getOfflineFeedback(): Promise<OfflineFeedback[]> {
    try {
      const stored = await AsyncStorage.getItem(OFFLINE_FEEDBACK_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Error retrieving offline feedback:", error);
      return [];
    }
  }

  // Get sync status
  async getSyncStatus(): Promise<SyncStatus> {
    try {
      const stored = await AsyncStorage.getItem(SYNC_STATUS_KEY);
      const offlineFeedback = await this.getOfflineFeedback();

      const defaultStatus: SyncStatus = {
        lastSyncAttempt: 0,
        totalPending: offlineFeedback.filter((f) => f.status === "pending")
          .length,
        totalFailed: offlineFeedback.filter((f) => f.status === "failed")
          .length,
        isCurrentlySyncing: this.syncInProgress,
      };

      return stored
        ? { ...JSON.parse(stored), ...defaultStatus }
        : defaultStatus;
    } catch (error) {
      console.error("Error retrieving sync status:", error);
      return {
        lastSyncAttempt: 0,
        totalPending: 0,
        totalFailed: 0,
        isCurrentlySyncing: false,
      };
    }
  }

  // Update sync status
  private async updateSyncStatus() {
    const status = await this.getSyncStatus();
    this.notifyListeners(status);
    await AsyncStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(status));
  }

  // Submit feedback (try online first, fallback to offline)
  async submitFeedback(
    requestBody: any
  ): Promise<{ success: boolean; id: string; offline: boolean }> {
    try {
      // Check network connectivity
      const netInfo = await NetInfo.fetch();

      if (!netInfo.isConnected) {
        // No connection, store offline
        const id = await this.storeFeedbackOffline(requestBody);
        return { success: true, id, offline: true };
      }

      // Try to submit online
      try {
        const response = await fetch(`${this.apiUrl}/api/network-feedback`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Server error");
        }

        return {
          success: true,
          id: data.id || "online_submission",
          offline: false,
        };
      } catch (networkError) {
        console.warn(
          "Online submission failed, storing offline:",
          networkError
        );
        // Network request failed, store offline
        const id = await this.storeFeedbackOffline(requestBody);
        return { success: true, id, offline: true };
      }
    } catch (error) {
      console.error("Error submitting feedback:", error);
      throw error;
    }
  }

  // Sync pending feedback
  async syncPendingFeedback(): Promise<void> {
    if (this.syncInProgress) {
      console.log("Sync already in progress");
      return;
    }

    try {
      this.syncInProgress = true;
      await this.updateSyncStatus();

      const offlineFeedback = await this.getOfflineFeedback();
      const pendingFeedback = offlineFeedback.filter(
        (f) => f.status === "pending" || f.status === "failed"
      );

      if (pendingFeedback.length === 0) {
        console.log("No pending feedback to sync");
        return;
      }

      console.log(`Syncing ${pendingFeedback.length} pending feedback items`);

      const syncPromises = pendingFeedback.map(async (feedback) => {
        try {
          // Mark as syncing
          await this.updateFeedbackStatus(feedback.id, "syncing");

          const response = await fetch(`${this.apiUrl}/api/network-feedback`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(feedback.requestBody),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.message || "Server error");
          }

          // Mark as synced
          await this.updateFeedbackStatus(feedback.id, "synced");
          console.log(`Successfully synced feedback: ${feedback.id}`);
        } catch (error) {
          console.error(`Failed to sync feedback ${feedback.id}:`, error);

          // Increment retry count and mark as failed if max retries exceeded
          const updatedFeedback = await this.incrementRetryCount(feedback.id);
          if (updatedFeedback && updatedFeedback.retryCount >= 3) {
            await this.updateFeedbackStatus(feedback.id, "failed");
            console.log(
              `Feedback ${feedback.id} marked as failed after 3 retry attempts`
            );
          } else {
            await this.updateFeedbackStatus(feedback.id, "pending");
          }
        }
      });

      await Promise.allSettled(syncPromises);

      // Clean up synced feedback (remove from local storage)
      await this.cleanupSyncedFeedback();
    } catch (error) {
      console.error("Error during sync process:", error);
    } finally {
      this.syncInProgress = false;
      await this.updateSyncStatus();
    }
  }

  // Update feedback status
  private async updateFeedbackStatus(
    feedbackId: string,
    status: OfflineFeedback["status"]
  ): Promise<void> {
    try {
      const offlineFeedback = await this.getOfflineFeedback();
      const updatedFeedback = offlineFeedback.map((f) =>
        f.id === feedbackId ? { ...f, status } : f
      );
      await AsyncStorage.setItem(
        OFFLINE_FEEDBACK_KEY,
        JSON.stringify(updatedFeedback)
      );
    } catch (error) {
      console.error("Error updating feedback status:", error);
    }
  }

  // Increment retry count
  private async incrementRetryCount(
    feedbackId: string
  ): Promise<OfflineFeedback | null> {
    try {
      const offlineFeedback = await this.getOfflineFeedback();
      const updatedFeedback = offlineFeedback.map((f) =>
        f.id === feedbackId ? { ...f, retryCount: f.retryCount + 1 } : f
      );
      await AsyncStorage.setItem(
        OFFLINE_FEEDBACK_KEY,
        JSON.stringify(updatedFeedback)
      );
      return updatedFeedback.find((f) => f.id === feedbackId) || null;
    } catch (error) {
      console.error("Error incrementing retry count:", error);
      return null;
    }
  }

  // Clean up successfully synced feedback
  private async cleanupSyncedFeedback(): Promise<void> {
    try {
      const offlineFeedback = await this.getOfflineFeedback();
      const activeFeedback = offlineFeedback.filter(
        (f) => f.status !== "synced"
      );
      await AsyncStorage.setItem(
        OFFLINE_FEEDBACK_KEY,
        JSON.stringify(activeFeedback)
      );
      console.log(
        `Cleaned up ${
          offlineFeedback.length - activeFeedback.length
        } synced feedback items`
      );
    } catch (error) {
      console.error("Error cleaning up synced feedback:", error);
    }
  }

  // Manually trigger sync (for user-initiated sync)
  async forceSyncFeedback(): Promise<void> {
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      throw new Error("No internet connection available");
    }
    await this.syncPendingFeedback();
  }

  // Clear all offline feedback (for debugging/admin purposes)
  async clearAllOfflineFeedback(): Promise<void> {
    try {
      await AsyncStorage.removeItem(OFFLINE_FEEDBACK_KEY);
      await AsyncStorage.removeItem(SYNC_STATUS_KEY);
      await this.updateSyncStatus();
      console.log("All offline feedback cleared");
    } catch (error) {
      console.error("Error clearing offline feedback:", error);
    }
  }

  // Get feedback statistics
  async getFeedbackStats(): Promise<{
    total: number;
    pending: number;
    synced: number;
    failed: number;
    syncing: number;
  }> {
    try {
      const offlineFeedback = await this.getOfflineFeedback();
      return {
        total: offlineFeedback.length,
        pending: offlineFeedback.filter((f) => f.status === "pending").length,
        synced: offlineFeedback.filter((f) => f.status === "synced").length,
        failed: offlineFeedback.filter((f) => f.status === "failed").length,
        syncing: offlineFeedback.filter((f) => f.status === "syncing").length,
      };
    } catch (error) {
      console.error("Error getting feedback stats:", error);
      return { total: 0, pending: 0, synced: 0, failed: 0, syncing: 0 };
    }
  }
}

// Export singleton instance
export const offlineFeedbackManager = new OfflineFeedbackManager();
