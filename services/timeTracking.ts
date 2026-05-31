export interface TrackerStage {
  name: string;
  minHours: number;
  maxHours: number;
  color: string;
}

export interface UserProgress {
  totalSeconds: number;
  currentStage: string;
  stageStartTime: number;
  lastUpdated: string;
}

export const TIME_TRACKING_STAGES: TrackerStage[] = [
  { name: 'Greenhorn', minHours: 0, maxHours: 2, color: '#8B5CF6' },
  { name: 'Learner', minHours: 2, maxHours: 7, color: '#3B82F6' },
  { name: 'Reader', minHours: 7, maxHours: 22, color: '#10B981' },
  { name: 'Ace', minHours: 22, maxHours: 47, color: '#F59E0B' },
  { name: 'Genius', minHours: 47, maxHours: 82, color: '#EF4444' },
  { name: 'Maverick', minHours: 82, maxHours: 117, color: '#EC4899' },
  { name: 'Titan', minHours: 117, maxHours: Infinity, color: '#7C3AED' },
];

export const DEFAULT_USER_PROGRESS: UserProgress = {
  totalSeconds: 0,
  currentStage: 'Greenhorn',
  stageStartTime: 0,
  lastUpdated: new Date().toISOString(),
};

export function getUserProgressStorageKey(userId?: string | null) {
  return userId ? `user_progress:${userId}` : 'user_progress:guest';
}

export function getStageForTotalSeconds(totalSeconds: number) {
  const totalHours = totalSeconds / 3600;
  return (
    TIME_TRACKING_STAGES.find(
      (stage) => totalHours >= stage.minHours && totalHours < stage.maxHours
    ) || TIME_TRACKING_STAGES[TIME_TRACKING_STAGES.length - 1]
  );
}
