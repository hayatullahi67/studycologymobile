import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import * as localDB from '../services/localDatabase';

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

export function useTimeTracker() {
  const { totalTimeSeconds, currentStage } = useAppStore();
  
  console.log('[useTimeTracker] State changed:', { totalTimeSeconds, currentStage });
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load initial data from database if global state is empty
    const loadInitialData = async () => {
      try {
        const saved = await localDB.getSetting('user_progress');
        if (saved) {
          const progress = JSON.parse(saved);
          // Update global state with saved data
          useAppStore.getState().updateTimeTracking(progress.totalSeconds, progress.currentStage);
        }
      } catch (error) {
        console.error('Error loading initial time data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  const getCurrentStage = () => {
    // Use the currentStage from global state directly
    return STAGES.find(stage => stage.name === currentStage) || STAGES[0];
  };

  const getNextStage = () => {
    const current = getCurrentStage();
    const currentIndex = STAGES.findIndex(s => s.name === current.name);
    return STAGES[currentIndex + 1] || null;
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
    stages: STAGES,
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