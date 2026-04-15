import React, { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as localDB from '../services/localDatabase';
import { useAppStore } from '../store/useAppStore';

interface UserProgress {
  totalSeconds: number;
  currentStage: string;
  stageStartTime: number;
  lastUpdated: string;
}

const STAGES = [
  { name: 'Greenhorn', minHours: 0, maxHours: 2, color: '#8B5CF6' },
  { name: 'Learner', minHours: 2, maxHours: 7, color: '#3B82F6' },
  { name: 'Reader', minHours: 7, maxHours: 22, color: '#10B981' },
  { name: 'Ace', minHours: 22, maxHours: 47, color: '#F59E0B' },
  { name: 'Genius', minHours: 47, maxHours: 82, color: '#EF4444' },
  { name: 'Maverick', minHours: 82, maxHours: 117, color: '#EC4899' },
  { name: 'Titan', minHours: 117, maxHours: Infinity, color: '#7C3AED' },
];

export function GlobalTimeTracker() {
  const startTimeRef = useRef<number | null>(null);
  const { updateTimeTracking } = useAppStore();

  useEffect(() => {
    // Start tracking immediately when component mounts
    startTimeRef.current = Date.now();

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      // Save any remaining time when component unmounts
      if (startTimeRef.current) {
        saveSessionTime(Date.now() - startTimeRef.current);
      }
    };
  }, []);

  const saveSessionTime = async (sessionMs: number) => {
    try {
      const sessionSeconds = Math.floor(sessionMs / 1000);
      if (sessionSeconds < 1) return; // Don't save sessions shorter than 1 second

      const saved = await localDB.getSetting('user_progress');
      let progress: UserProgress = {
        totalSeconds: 0,
        currentStage: 'Greenhorn',
        stageStartTime: 0,
        lastUpdated: new Date().toISOString()
      };

      if (saved) {
        progress = JSON.parse(saved);
      }

      const newTotalSeconds = progress.totalSeconds + sessionSeconds;

      // Calculate current stage
      const totalHours = newTotalSeconds / 3600;
      const currentStage = STAGES.find(stage =>
        totalHours >= stage.minHours && totalHours < stage.maxHours
      ) || STAGES[STAGES.length - 1];

      const updatedProgress: UserProgress = {
        ...progress,
        totalSeconds: newTotalSeconds,
        currentStage: currentStage.name,
        lastUpdated: new Date().toISOString()
      };

      await localDB.saveSetting('user_progress', JSON.stringify(updatedProgress));

      // Update global state immediately
      updateTimeTracking(newTotalSeconds, currentStage.name);
      console.log('[TimeTracker] Updated global state:', { totalSeconds: newTotalSeconds, stage: currentStage.name });
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
        saveSessionTime(sessionMs);
        startTimeRef.current = null;
      }
    }
  };

  // This component doesn't render anything
  return null;
}