export interface User {
  id: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  userId: string;
  theme: 'light' | 'dark' | 'system';
  unitSystem: 'metric' | 'imperial';
  reminderMorningTime?: string; // "HH:MM" format
  reminderEveningTime?: string; // "HH:MM" format
  isNotificationsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutPlan {
  id: string;
  userId: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  days?: WorkoutDay[];
}

export interface WorkoutDay {
  id: string;
  userId: string;
  planId: string;
  name: string;
  dayOrder: number; // 0 for Mon, 1 for Tue, etc.
  createdAt: string;
  updatedAt: string;
  exercises?: Exercise[];
}

export interface Exercise {
  id: string;
  userId: string;
  workoutDayId: string;
  name: string;
  category: 'strength' | 'cardio';
  targetMuscleGroup?: string;
  exerciseOrder: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // Specific targets
  targetSets: number;
  minReps: number;
  maxReps: number;
  cardioDurationMinutes?: number;
}

export interface WorkoutLog {
  id: string;
  userId: string;
  workoutDayId?: string;
  name: string; // e.g., "Push A"
  startedAt: string; // ISO string
  completedAt?: string; // ISO string
  durationSeconds?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  sets?: ExerciseSet[];
  cardioLogs?: CardioLog[];
}

export interface ExerciseSet {
  id: string;
  userId: string;
  workoutLogId: string;
  exerciseId?: string;
  exerciseName: string;
  setOrder: number;
  weight?: number; // In selected unit (kg or lbs)
  reps?: number;
  rpe?: number;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PersonalRecord {
  id: string;
  userId: string;
  exerciseName: string;
  prType: 'weight' | 'reps' | 'volume';
  value: number; // weight in kg, reps count, or volume in kg*reps
  loggedAt: string;
  workoutLogId?: string;
  exerciseSetId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CardioLog {
  id: string;
  userId: string;
  workoutLogId?: string;
  name: string;
  distance?: number; // in km or miles
  durationSeconds: number;
  caloriesBurned?: number;
  intensity?: 'low' | 'medium' | 'high';
  loggedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface BodyMeasurement {
  id: string;
  userId: string;
  weight?: number; // in kg or lbs
  bodyFatPercentage?: number;
  neck?: number; // in cm or inches
  chest?: number;
  bicepLeft?: number;
  bicepRight?: number;
  forearmLeft?: number;
  forearmRight?: number;
  waist?: number;
  hips?: number;
  thighLeft?: number;
  thighRight?: number;
  calfLeft?: number;
  calfRight?: number;
  measuredAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProgressPhoto {
  id: string;
  userId: string;
  photoUrl: string; // Local file URI or remote Supabase storage URL
  photoType: 'front' | 'side' | 'back';
  takenAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationLog {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  scheduledFor?: string;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Sync Queue types
export interface SyncQueueItem {
  id: string; // unique queue item id
  table: string; // target table name (e.g. 'workout_logs')
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  payload: any; // the actual record data
  timestamp: string; // when the write occurred
}
