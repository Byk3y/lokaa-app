import { log } from '@/utils/logger';
export interface LevelThreshold {
  level: number;
  name: string;
  pointsRequired: number;
}

export const LEVEL_THRESHOLDS: LevelThreshold[] = [
  { level: 1, name: 'Level 1', pointsRequired: 0 },
  { level: 2, name: 'Level 2', pointsRequired: 5 },
  { level: 3, name: 'Level 3', pointsRequired: 20 },
  { level: 4, name: 'Level 4', pointsRequired: 65 },
  { level: 5, name: 'Level 5', pointsRequired: 155 },
  { level: 6, name: 'Level 6', pointsRequired: 515 },
  { level: 7, name: 'Level 7', pointsRequired: 2015 },
  { level: 8, name: 'Level 8', pointsRequired: 8015 },
  { level: 9, name: 'Level 9', pointsRequired: 33015 },
  // Add a hypothetical Level 10 for calculating progress beyond Level 9
  { level: 10, name: 'Level 10', pointsRequired: Infinity }, 
];

export interface UserLevelInfo {
  level: number;
  name: string;
  currentLevelPointsRequired: number;
  pointsForNextLevel: number;
  pointsNeededForNextLevel: number;
  progressPercentage: number;
  isMaxLevel: boolean;
}

/**
 * Calculates the user's current level based on their points.
 */
export function calculateUserLevelInfo(points: number): UserLevelInfo {
  let currentLevelInfo: LevelThreshold = LEVEL_THRESHOLDS[0];
  let nextLevelInfo: LevelThreshold | null = null;

  // Find the current level by iterating downwards from the highest threshold
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (points >= LEVEL_THRESHOLDS[i].pointsRequired) {
      currentLevelInfo = LEVEL_THRESHOLDS[i];
      if (i < LEVEL_THRESHOLDS.length - 1) {
        nextLevelInfo = LEVEL_THRESHOLDS[i+1];
      }
      break;
    }
  }

  const isMaxLevel = !nextLevelInfo || nextLevelInfo.pointsRequired === Infinity;
  let pointsForNextLevel = 0;
  let pointsNeededForNextLevel = 0;
  let progressPercentage = 0;

  if (!isMaxLevel && nextLevelInfo) {
    pointsForNextLevel = nextLevelInfo.pointsRequired;
    pointsNeededForNextLevel = nextLevelInfo.pointsRequired - points;
    const pointsInCurrentLevelRange = nextLevelInfo.pointsRequired - currentLevelInfo.pointsRequired;
    const pointsEarnedInCurrentRange = points - currentLevelInfo.pointsRequired;
    progressPercentage = pointsInCurrentLevelRange > 0 ? (pointsEarnedInCurrentRange / pointsInCurrentLevelRange) * 100 : 100;
  } else {
    // Handle max level case (or if something unexpected happens)
    pointsForNextLevel = currentLevelInfo.pointsRequired; // Or some other appropriate value
    pointsNeededForNextLevel = 0;
    progressPercentage = 100; 
  }

  return {
    level: currentLevelInfo.level,
    name: currentLevelInfo.name,
    currentLevelPointsRequired: currentLevelInfo.pointsRequired,
    pointsForNextLevel,
    pointsNeededForNextLevel,
    progressPercentage: Math.max(0, Math.min(100, progressPercentage)), // Clamp between 0 and 100
    isMaxLevel,
  };
}

/**
 * Formats a date string into a more readable format.
 * Example: "MMM d, yyyy"
 */
export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch (error) {
    log.error('Utils', 'Error formatting date:', error);
    return 'Invalid Date';
  }
};

/**
 * Generates initials from a full name.
 */
export const getInitials = (name: string | null | undefined): string => {
  if (!name) return '?';
  const names = name.trim().split(' ');
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
}; 