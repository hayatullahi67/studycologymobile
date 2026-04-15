import { useState, useCallback } from 'react';

interface AdRotationConfig {
  urgent: number;      // Show Urgent every N questions (3)
  high: number;        // Show High every N questions (4-5)
  normal: number;      // Show Normal every N questions (6)
  low: number;         // Show Low every N questions (6)
}

const AD_ROTATION_CONFIG: AdRotationConfig = {
  urgent: 3,
  high: 4,
  normal: 6,
  low: 6,
};

interface AdRotationState {
  currentPriority: number; // 3=Urgent, 2=High, 1=Normal, 0=Low
  questionsInCycle: number;
  priorityQueue: number[]; // [3, 2, 1, 0, 3, 2, 1, 0, ...]
  completedPriorities: Set<number>;
}

/**
 * Smart ad rotation hook for exam mode
 * - Shows Urgent ads every 3 questions
 * - Shows High ads every 4 questions
 * - Shows Normal ads every 6 questions
 * - Shows Low ads every 6 questions
 * - Cycles through all priorities before repeating
 */
export function useAdRotation() {
  const [state, setState] = useState<AdRotationState>({
    currentPriority: 3, // Start with Urgent
    questionsInCycle: 0,
    priorityQueue: [3, 2, 1, 0],
    completedPriorities: new Set(),
  });

  /**
   * Determine if current question should show an ad and which priority
   * @param questionIndex - Current question index (0-based)
   * @returns { shouldShowAd: boolean, priority: number | null }
   */
  const getAdConfig = useCallback((questionIndex: number) => {
    if (questionIndex < 2) {
      // No ads for first 2 questions
      return { shouldShowAd: false, priority: null };
    }

    const adjustedIndex = questionIndex - 2; // Start counting from Q3
    const { currentPriority } = state;
    const interval = getIntervalForPriority(currentPriority);

    // Check if this question should show an ad
    const shouldShowAd = (adjustedIndex + 1) % interval === 0;

    return {
      shouldShowAd,
      priority: shouldShowAd ? currentPriority : null,
    };
  }, [state]);

  /**
   * Move to next priority level
   */
  const moveToNextPriority = useCallback(() => {
    setState(prev => {
      const newCompleted = new Set(prev.completedPriorities);
      newCompleted.add(prev.currentPriority);

      // Find next uncompleted priority, or restart if all done
      let nextPriority = prev.priorityQueue.find(p => !newCompleted.has(p));

      if (!nextPriority) {
        // All priorities completed, restart
        nextPriority = 3; // Back to Urgent
        newCompleted.clear();
      }

      return {
        ...prev,
        currentPriority: nextPriority,
        questionsInCycle: 0,
        completedPriorities: newCompleted,
      };
    });
  }, []);

  /**
   * Get interval (how many questions between ads) for a priority level
   */
  const getIntervalForPriority = (priority: number): number => {
    switch (priority) {
      case 3:
        return AD_ROTATION_CONFIG.urgent;
      case 2:
        return AD_ROTATION_CONFIG.high;
      case 1:
        return AD_ROTATION_CONFIG.normal;
      case 0:
        return AD_ROTATION_CONFIG.low;
      default:
        return 6;
    }
  };

  /**
   * Get priority filter for current cycle
   */
  const getCurrentPriorityFilter = useCallback(() => {
    return [state.currentPriority];
  }, [state.currentPriority]);

  /**
   * Reset rotation (e.g., when exam changes)
   */
  const reset = useCallback(() => {
    setState({
      currentPriority: 3,
      questionsInCycle: 0,
      priorityQueue: [3, 2, 1, 0],
      completedPriorities: new Set(),
    });
  }, []);

  return {
    getAdConfig,
    moveToNextPriority,
    getCurrentPriorityFilter,
    reset,
    state,
  };
}
