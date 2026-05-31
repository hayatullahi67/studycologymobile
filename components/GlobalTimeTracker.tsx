import React, { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as localDB from '../services/localDatabase';
import { useAppStore } from '../store/useAppStore';
import {
  DEFAULT_USER_PROGRESS,
  UserProgress,
  getStageForTotalSeconds,
  getUserProgressStorageKey,
} from '../services/timeTracking';

export function GlobalTimeTracker() {
  const startTimeRef = useRef<number | null>(null);
  const previousStorageKeyRef = useRef<string | null>(null);
  const activeStorageKeyRef = useRef<string>(getUserProgressStorageKey(null));
  const { updateTimeTracking, userProfile } = useAppStore();
  const storageKey = getUserProgressStorageKey(userProfile?.id ?? null);

  useEffect(() => {
    // Start tracking immediately when component mounts
    startTimeRef.current = Date.now();

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      // Save any remaining time when component unmounts
      if (startTimeRef.current) {
        saveSessionTime(Date.now() - startTimeRef.current, activeStorageKeyRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const previousStorageKey = previousStorageKeyRef.current;

    const switchTrackedUser = async () => {
      if (previousStorageKey && previousStorageKey !== storageKey && startTimeRef.current) {
        const sessionMs = Date.now() - startTimeRef.current;
        await saveSessionTime(sessionMs, previousStorageKey);
      }

      previousStorageKeyRef.current = storageKey;
      activeStorageKeyRef.current = storageKey;
      startTimeRef.current = Date.now();
    };

    switchTrackedUser();
  }, [storageKey]);

  const saveSessionTime = async (sessionMs: number, keyOverride?: string) => {
    try {
      const sessionSeconds = Math.floor(sessionMs / 1000);
      if (sessionSeconds < 1) return; // Don't save sessions shorter than 1 second

      const progressKey = keyOverride || storageKey;
      const saved = await localDB.getSetting(progressKey);
      let progress: UserProgress = { ...DEFAULT_USER_PROGRESS };

      if (saved) {
        progress = JSON.parse(saved);
      }

      const newTotalSeconds = progress.totalSeconds + sessionSeconds;
      const currentStage = getStageForTotalSeconds(newTotalSeconds);

      const updatedProgress: UserProgress = {
        ...progress,
        totalSeconds: newTotalSeconds,
        currentStage: currentStage.name,
        lastUpdated: new Date().toISOString()
      };

      await localDB.saveSetting(progressKey, JSON.stringify(updatedProgress));

      if (progressKey === storageKey) {
        updateTimeTracking(newTotalSeconds, currentStage.name);
        console.log('[TimeTracker] Updated global state:', { totalSeconds: newTotalSeconds, stage: currentStage.name, storageKey: progressKey });
      }
    } catch (error) {
      console.error('Error saving session time:', error);
    }
  };

  const handleAppStateChange = (nextAppState: string) => {
    if (nextAppState === 'active') {
      // App became active
      startTimeRef.current = Date.now();
    } else if (nextAppState === 'background' || nextAppState === 'inactive') {
      // App went to background
      if (startTimeRef.current) {
        const sessionMs = Date.now() - startTimeRef.current;
        saveSessionTime(sessionMs, activeStorageKeyRef.current);
        startTimeRef.current = null;
      }
    }
  };

  // This component doesn't render anything
  return null;
}
