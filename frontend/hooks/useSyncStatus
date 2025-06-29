// hooks/useSyncStatus.ts
import { useState, useEffect } from "react";
import {
  offlineFeedbackManager,
  SyncStatus,
} from "../lib/offlineFeedbackManager";

export interface SyncStatusHookReturn {
  syncStatus: SyncStatus | null;
  isLoading: boolean;
  forceSyncFeedback: () => Promise<void>;
  clearAllOfflineFeedback: () => Promise<void>;
  getFeedbackStats: () => Promise<{
    total: number;
    pending: number;
    synced: number;
    failed: number;
    syncing: number;
  }>;
}

export const useSyncStatus = (): SyncStatusHookReturn => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initial load
    const loadInitialStatus = async () => {
      try {
        const status = await offlineFeedbackManager.getSyncStatus();
        setSyncStatus(status);
      } catch (error) {
        console.error("Error loading initial sync status:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialStatus();

    // Listen for sync status updates
    const handleSyncStatusUpdate = (status: SyncStatus) => {
      setSyncStatus(status);
    };

    offlineFeedbackManager.addSyncStatusListener(handleSyncStatusUpdate);

    return () => {
      offlineFeedbackManager.removeSyncStatusListener(handleSyncStatusUpdate);
    };
  }, []);

  const forceSyncFeedback = async () => {
    try {
      await offlineFeedbackManager.forceSyncFeedback();
    } catch (error) {
      console.error("Error forcing sync:", error);
      throw error;
    }
  };

  const clearAllOfflineFeedback = async () => {
    try {
      await offlineFeedbackManager.clearAllOfflineFeedback();
    } catch (error) {
      console.error("Error clearing offline feedback:", error);
      throw error;
    }
  };

  const getFeedbackStats = async () => {
    try {
      return await offlineFeedbackManager.getFeedbackStats();
    } catch (error) {
      console.error("Error getting feedback stats:", error);
      throw error;
    }
  };

  return {
    syncStatus,
    isLoading,
    forceSyncFeedback,
    clearAllOfflineFeedback,
    getFeedbackStats,
  };
};
