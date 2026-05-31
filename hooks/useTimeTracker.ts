import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import * as localDB from '../services/localDatabase';
import {
  DEFAULT_USER_PROGRESS,
  TIME_TRACKING_STAGES,
  UserProgress,
  getUserProgressStorageKey,
} from '../services/timeTracking';

export function useTimeTracker() {
  const { totalTimeSeconds, currentStage, userProfile } = useAppStore();
  const userId = userProfile?.id ?? null;
  
  console.log('[useTimeTracker] State changed:', { totalTimeSeconds, currentStage });
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        const saved = await localDB.getSetting(getUserProgressStorageKey(userId));
        if (saved) {
          const progress: UserProgress = JSON.parse(saved);
          useAppStore.getState().updateTimeTracking(progress.totalSeconds, progress.currentStage);
        } else {
          useAppStore.getState().updateTimeTracking(
            DEFAULT_USER_PROGRESS.totalSeconds,
            DEFAULT_USER_PROGRESS.currentStage
          );
        }
      } catch (error) {
        console.error('Error loading initial time data:', error);
        useAppStore.getState().updateTimeTracking(
          DEFAULT_USER_PROGRESS.totalSeconds,
          DEFAULT_USER_PROGRESS.currentStage
        );
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [userId]);

  const getCurrentStage = () => {
    return TIME_TRACKING_STAGES.find(stage => stage.name === currentStage) || TIME_TRACKING_STAGES[0];
  };

  const getNextStage = () => {
    const current = getCurrentStage();
    const currentIndex = TIME_TRACKING_STAGES.findIndex(s => s.name === current.name);
    return TIME_TRACKING_STAGES[currentIndex + 1] || null;
  };

  const getProgressToNextStage = () => {
    const current = getCurrentStage();
    const next = getNextStage();
    if (!next) return 100; // Max level

    const totalHours = totalTimeSeconds / 3600;
    const stageProgress = totalHours - current.minHours;
    const stageTotal = next.minHours - current.minHours;

    return Math.min((stageProgress / stageTotal) * 100, 100);
  };

  const getTotalHours = () => totalTimeSeconds / 3600;

  const currentStageObj = getCurrentStage();
  const nextStageObj = getNextStage();
  const progressPercent = getProgressToNextStage();
  const totalHours = getTotalHours();

  return {
    progress: {
      totalSeconds: totalTimeSeconds,
      currentStage,
      stageStartTime: 0,
      lastUpdated: new Date().toISOString()
    },
    loading,
    stages: TIME_TRACKING_STAGES,
    currentStage: currentStageObj,
    nextStage: nextStageObj,
    progressPercent,
    totalHours,
    // Keep the functions for compatibility
    getCurrentStage,
    getNextStage,
    getProgressToNextStage,
    getTotalHours
  };
}
