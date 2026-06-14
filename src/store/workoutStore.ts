import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  WorkoutPlan as BaseWorkoutPlan,
  WorkoutDay as BaseWorkoutDay,
  Exercise as BaseExercise,
  WorkoutLog,
  ExerciseSet,
  CardioLog,
  PersonalRecord,
} from '../types';
import { calculateNextWeight } from '../utils/progressiveOverload';
import { useSyncStore, generateUUID } from './syncStore';
import { syncService } from '../services/syncService';

// Extend base types to support local target weight suggestions
export interface Exercise extends BaseExercise {
  targetWeight?: number;
}

export interface WorkoutDay extends BaseWorkoutDay {
  exercises?: Exercise[];
}

export interface WorkoutPlan extends BaseWorkoutPlan {
  days?: WorkoutDay[];
}

export interface RestTimerState {
  duration: number;
  isRunning: boolean;
  secondsRemaining: number;
  startTime: number | null;
}

export interface WorkoutState {
  plans: WorkoutPlan[];
  workoutLogs: WorkoutLog[];
  personalRecords: PersonalRecord[];
  activeWorkoutLog: WorkoutLog | null;
  exerciseWeights: Record<string, number>; // Maps exercise name -> current target weight
  restTimer: RestTimerState;

  // Actions
  initDefaultPlans: (userId: string) => void;
  startWorkout: (day: WorkoutDay, userId: string) => void;
  updateSet: (setId: string, updates: Partial<ExerciseSet>) => void;
  addSet: (exerciseId: string, exerciseName: string, userId: string) => void;
  removeSet: (setId: string) => void;
  toggleSetCompletion: (setId: string) => void;
  updateCardioLog: (cardioLogId: string, updates: Partial<CardioLog>) => void;
  completeWorkout: (notes?: string) => Promise<void>;
  cancelWorkout: () => void;
  startRestTimer: (seconds: number) => void;
  stopRestTimer: () => void;
  getSuggestedWeight: (exerciseName: string, targetMuscleGroup?: string) => number;
  addWorkoutDay: (planId: string, name: string, focus: string, exercises: any[], userId: string) => void;
  deleteWorkoutDay: (dayId: string) => void;
  addExerciseToDay: (dayId: string, exerciseData: any, userId: string) => void;
  deleteExerciseFromDay: (dayId: string, exerciseId: string) => void;
}

// Generate the initial default 6-Day PPL + Recovery Day split
export const createDefaultWorkoutPlan = (userId: string): WorkoutPlan => {
  const planId = generateUUID();

  const daysData = [
    {
      name: 'Push A',
      focus: 'Chest, Shoulders, Triceps (Heavy Compound Focus)',
      exercises: [
        { name: 'Barbell Bench Press', category: 'strength', targetSets: 4, minReps: 6, maxReps: 8, targetMuscleGroup: 'Chest' },
        { name: 'Barbell Overhead Press', category: 'strength', targetSets: 3, minReps: 8, maxReps: 10, targetMuscleGroup: 'Shoulders' },
        { name: 'Incline Dumbbell Bench Press', category: 'strength', targetSets: 3, minReps: 10, maxReps: 12, targetMuscleGroup: 'Chest' },
        { name: 'Dumbbell Lateral Raise', category: 'strength', targetSets: 4, minReps: 12, maxReps: 15, targetMuscleGroup: 'Shoulders' },
        { name: 'Cable Tricep Pushdown', category: 'strength', targetSets: 3, minReps: 10, maxReps: 12, targetMuscleGroup: 'Triceps' },
      ],
    },
    {
      name: 'Pull A',
      focus: 'Back, Biceps, Rear Delts (Heavy Pull Focus)',
      exercises: [
        { name: 'Barbell Deadlift', category: 'strength', targetSets: 3, minReps: 5, maxReps: 5, targetMuscleGroup: 'Back' },
        { name: 'Pull-Ups', category: 'strength', targetSets: 3, minReps: 8, maxReps: 10, targetMuscleGroup: 'Back' },
        { name: 'Barbell Row', category: 'strength', targetSets: 3, minReps: 8, maxReps: 10, targetMuscleGroup: 'Back' },
        { name: 'Cable Face Pull', category: 'strength', targetSets: 4, minReps: 12, maxReps: 15, targetMuscleGroup: 'Rear Delts' },
        { name: 'Barbell Bicep Curl', category: 'strength', targetSets: 3, minReps: 10, maxReps: 12, targetMuscleGroup: 'Biceps' },
      ],
    },
    {
      name: 'Legs + Core A',
      focus: 'Quads, Hamstrings, Calves, Abs (Heavy Squat Focus)',
      exercises: [
        { name: 'Barbell Back Squat', category: 'strength', targetSets: 4, minReps: 6, maxReps: 8, targetMuscleGroup: 'Legs & Core' },
        { name: 'Barbell Romanian Deadlift', category: 'strength', targetSets: 3, minReps: 8, maxReps: 10, targetMuscleGroup: 'Hamstrings' },
        { name: 'Leg Press', category: 'strength', targetSets: 3, minReps: 10, maxReps: 12, targetMuscleGroup: 'Legs & Core' },
        { name: 'Standing Calf Raise', category: 'strength', targetSets: 4, minReps: 12, maxReps: 15, targetMuscleGroup: 'Calves' },
        { name: 'Hanging Leg Raise', category: 'strength', targetSets: 3, minReps: 12, maxReps: 15, targetMuscleGroup: 'Abs' },
      ],
    },
    {
      name: 'Recovery Day',
      focus: 'Active Recovery & Mobility',
      exercises: [
        { name: 'Treadmill Walk', category: 'cardio', targetSets: 1, minReps: 0, maxReps: 0, cardioDurationMinutes: 30, targetMuscleGroup: 'legs & core' },
      ],
    },
    {
      name: 'Push B',
      focus: 'Chest, Shoulders, Triceps (Volume / Dumbbell Focus)',
      exercises: [
        { name: 'Incline Barbell Bench Press', category: 'strength', targetSets: 4, minReps: 8, maxReps: 10, targetMuscleGroup: 'Chest' },
        { name: 'Dumbbell Shoulder Press', category: 'strength', targetSets: 3, minReps: 8, maxReps: 10, targetMuscleGroup: 'Shoulders' },
        { name: 'Dumbbell Chest Fly', category: 'strength', targetSets: 3, minReps: 10, maxReps: 12, targetMuscleGroup: 'Chest' },
        { name: 'Dumbbell Lateral Raise', category: 'strength', targetSets: 3, minReps: 12, maxReps: 15, targetMuscleGroup: 'Shoulders' },
        { name: 'Overhead Dumbbell Tricep Extension', category: 'strength', targetSets: 3, minReps: 10, maxReps: 12, targetMuscleGroup: 'Triceps' },
      ],
    },
    {
      name: 'Pull B',
      focus: 'Back, Biceps, Rear Delts (Volume / Row Focus)',
      exercises: [
        { name: 'Lat Pulldown', category: 'strength', targetSets: 3, minReps: 10, maxReps: 12, targetMuscleGroup: 'Back' },
        { name: 'Seated Cable Row', category: 'strength', targetSets: 3, minReps: 10, maxReps: 12, targetMuscleGroup: 'Back' },
        { name: 'Dumbbell Shrug', category: 'strength', targetSets: 3, minReps: 12, maxReps: 15, targetMuscleGroup: 'Back' },
        { name: 'Dumbbell Rear Delt Fly', category: 'strength', targetSets: 4, minReps: 12, maxReps: 15, targetMuscleGroup: 'Rear Delts' },
        { name: 'Dumbbell Hammer Curl', category: 'strength', targetSets: 3, minReps: 10, maxReps: 12, targetMuscleGroup: 'Biceps' },
      ],
    },
    {
      name: 'Legs + Core B',
      focus: 'Legs, Core (Volume / Unilateral Focus)',
      exercises: [
        { name: 'Barbell Front Squat', category: 'strength', targetSets: 3, minReps: 8, maxReps: 10, targetMuscleGroup: 'Legs & Core' },
        { name: 'Lying Leg Curl', category: 'strength', targetSets: 3, minReps: 10, maxReps: 12, targetMuscleGroup: 'Hamstrings' },
        { name: 'Dumbbell Bulgarian Split Squat', category: 'strength', targetSets: 3, minReps: 8, maxReps: 10, targetMuscleGroup: 'Legs & Core' },
        { name: 'Seated Calf Raise', category: 'strength', targetSets: 4, minReps: 12, maxReps: 15, targetMuscleGroup: 'Calves' },
        { name: 'Ab Wheel Rollout', category: 'strength', targetSets: 3, minReps: 10, maxReps: 12, targetMuscleGroup: 'Abs' },
      ],
    },
  ];

  const days: WorkoutDay[] = daysData.map((d, index) => {
    const dayId = generateUUID();
    return {
      id: dayId,
      userId,
      planId,
      name: d.name,
      dayOrder: index,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      exercises: d.exercises.map((e: any, eIdx) => ({
        id: generateUUID(),
        userId,
        workoutDayId: dayId,
        name: e.name,
        category: e.category as 'strength' | 'cardio',
        targetMuscleGroup: e.targetMuscleGroup,
        exerciseOrder: eIdx,
        notes: d.focus,
        targetSets: e.targetSets,
        minReps: e.minReps,
        maxReps: e.maxReps,
        cardioDurationMinutes: e.cardioDurationMinutes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
    };
  });

  return {
    id: planId,
    userId,
    name: 'Push / Pull / Legs (PPL) Split',
    description: 'A 6-day program targeting hypertrophy and progressive overload, separated by a mid-week active recovery day.',
    isActive: true,
    days,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

let timerInterval: any = null;

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set, get) => ({
      plans: [],
      workoutLogs: [],
      personalRecords: [],
      activeWorkoutLog: null,
      exerciseWeights: {},
      restTimer: {
        duration: 0,
        isRunning: false,
        secondsRemaining: 0,
        startTime: null,
      },

      initDefaultPlans: (userId) => {
        const { plans } = get();
        if (plans.length === 0) {
          const defaultPlan = createDefaultWorkoutPlan(userId);
          set({ plans: [defaultPlan] });

          // Queue the default plan setup to Supabase
          const { addToQueue } = useSyncStore.getState();
          const { days, ...flatPlan } = defaultPlan;
          addToQueue({ table: 'workout_plans', action: 'INSERT', payload: flatPlan });

          if (days) {
            for (const day of days) {
              const { exercises, ...flatDay } = day;
              addToQueue({ table: 'workout_days', action: 'INSERT', payload: flatDay });
              if (exercises) {
                for (const exercise of exercises) {
                  addToQueue({ table: 'exercises', action: 'INSERT', payload: exercise });
                }
              }
            }
          }
          syncService.sync();
        }
      },

      getSuggestedWeight: (exerciseName, targetMuscleGroup) => {
        const { exerciseWeights, workoutLogs } = get();
        
        // 1. Check direct weights dictionary
        if (exerciseWeights[exerciseName] !== undefined) {
          return exerciseWeights[exerciseName];
        }

        // 2. Scan completed workout logs for the last performance of this exercise
        for (let i = workoutLogs.length - 1; i >= 0; i--) {
          const log = workoutLogs[i];
          const matchingSets = log.sets?.filter((s) => s.exerciseName === exerciseName && s.isCompleted);
          if (matchingSets && matchingSets.length > 0) {
            // Suggest the weight of the last completed set
            const lastSetWeight = matchingSets[matchingSets.length - 1].weight;
            if (lastSetWeight !== undefined) return lastSetWeight;
          }
        }

        // 3. Sensible defaults based on muscle groups if no history exists
        if (targetMuscleGroup) {
          const group = targetMuscleGroup.toLowerCase();
          if (group.includes('chest') || group.includes('shoulders') || group.includes('back')) {
            return 20.0; // Standard barbell / baseline compound weight
          }
          if (group.includes('legs') || group.includes('quads') || group.includes('hamstrings')) {
            return 40.0; // Standard compound lower body starting weight
          }
        }

        return 10.0; // Safe general isolation exercise default
      },

      startWorkout: (day, userId) => {
        // Clear any previous active workout session
        get().cancelWorkout();

        const logId = generateUUID();
        const workoutLog: WorkoutLog = {
          id: logId,
          userId,
          workoutDayId: day.id,
          name: day.name,
          startedAt: new Date().toISOString(),
          notes: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          sets: [],
          cardioLogs: [],
        };

        if (day.exercises) {
          day.exercises.forEach((exercise) => {
            if (exercise.category === 'strength') {
              const suggestedWeight = get().getSuggestedWeight(exercise.name, exercise.targetMuscleGroup);
              for (let i = 0; i < exercise.targetSets; i++) {
                workoutLog.sets?.push({
                  id: generateUUID(),
                  userId,
                  workoutLogId: logId,
                  exerciseId: exercise.id,
                  exerciseName: exercise.name,
                  setOrder: i,
                  weight: suggestedWeight,
                  reps: exercise.maxReps, // pre-fill with upper target rep range
                  rpe: undefined,
                  isCompleted: false,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                });
              }
            } else if (exercise.category === 'cardio') {
              workoutLog.cardioLogs?.push({
                id: generateUUID(),
                userId,
                workoutLogId: logId,
                name: exercise.name,
                durationSeconds: (exercise.cardioDurationMinutes ?? 30) * 60,
                intensity: 'medium',
                loggedAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
            }
          });
        }

        set({ activeWorkoutLog: workoutLog });
      },

      updateSet: (setId, updates) => {
        set((state) => {
          if (!state.activeWorkoutLog) return state;

          const updatedSets = state.activeWorkoutLog.sets?.map((set) => {
            if (set.id === setId) {
              return {
                ...set,
                ...updates,
                updatedAt: new Date().toISOString(),
              };
            }
            return set;
          });

          return {
            activeWorkoutLog: {
              ...state.activeWorkoutLog,
              sets: updatedSets,
            },
          };
        });
      },

      addSet: (exerciseId, exerciseName, userId) => {
        set((state) => {
          if (!state.activeWorkoutLog) return state;

          const currentSets = state.activeWorkoutLog.sets?.filter((s) => s.exerciseId === exerciseId) || [];
          const nextOrder = currentSets.length;
          
          // Use previous set's parameters as starting point, or look up suggestions
          const lastSet = currentSets[currentSets.length - 1];
          const weight = lastSet?.weight ?? state.getSuggestedWeight(exerciseName);
          const reps = lastSet?.reps ?? 10;

          const newSet: ExerciseSet = {
            id: generateUUID(),
            userId,
            workoutLogId: state.activeWorkoutLog.id,
            exerciseId,
            exerciseName,
            setOrder: nextOrder,
            weight,
            reps,
            isCompleted: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          return {
            activeWorkoutLog: {
              ...state.activeWorkoutLog,
              sets: [...(state.activeWorkoutLog.sets || []), newSet],
            },
          };
        });
      },

      removeSet: (setId) => {
        set((state) => {
          if (!state.activeWorkoutLog) return state;

          const remainingSets = state.activeWorkoutLog.sets?.filter((s) => s.id !== setId) || [];
          
          // Re-order the setOrder index within each exercise group
          const exerciseGroups: Record<string, ExerciseSet[]> = {};
          remainingSets.forEach((set) => {
            const key = set.exerciseId || set.exerciseName;
            if (!exerciseGroups[key]) exerciseGroups[key] = [];
            exerciseGroups[key].push(set);
          });

          const finalizedSets: ExerciseSet[] = [];
          Object.values(exerciseGroups).forEach((group) => {
            group
              .sort((a, b) => a.setOrder - b.setOrder)
              .forEach((set, idx) => {
                finalizedSets.push({ ...set, setOrder: idx });
              });
          });

          return {
            activeWorkoutLog: {
              ...state.activeWorkoutLog,
              sets: finalizedSets,
            },
          };
        });
      },

      toggleSetCompletion: (setId) => {
        const { activeWorkoutLog } = get();
        if (!activeWorkoutLog) return;

        const targetSet = activeWorkoutLog.sets?.find((s) => s.id === setId);
        if (!targetSet) return;

        const newCompletionState = !targetSet.isCompleted;
        get().updateSet(setId, { isCompleted: newCompletionState });

        // Trigger rest timer (default to 90 seconds) if set completed successfully
        if (newCompletionState) {
          get().startRestTimer(90);
        }
      },

      updateCardioLog: (cardioLogId, updates) => {
        set((state) => {
          if (!state.activeWorkoutLog) return state;

          const updatedCardio = state.activeWorkoutLog.cardioLogs?.map((log) => {
            if (log.id === cardioLogId) {
              return {
                ...log,
                ...updates,
                updatedAt: new Date().toISOString(),
              };
            }
            return log;
          });

          return {
            activeWorkoutLog: {
              ...state.activeWorkoutLog,
              cardioLogs: updatedCardio,
            },
          };
        });
      },

      completeWorkout: async (notes) => {
        const { activeWorkoutLog, plans, personalRecords, exerciseWeights } = get();
        if (!activeWorkoutLog) {
          throw new Error('No active workout session to complete.');
        }

        const now = new Date();
        const completedLog: WorkoutLog = {
          ...activeWorkoutLog,
          notes: notes || activeWorkoutLog.notes,
          completedAt: now.toISOString(),
          durationSeconds: Math.max(
            0,
            Math.round((now.getTime() - new Date(activeWorkoutLog.startedAt).getTime()) / 1000)
          ),
          updatedAt: now.toISOString(),
        };

        const userId = completedLog.userId;
        const newPRs: PersonalRecord[] = [];
        const updatedExerciseWeights = { ...exerciseWeights };
        const updatedPlans = [...plans];

        // 1. Process progressive overload & personal records
        const allSetsByExerciseName: Record<string, ExerciseSet[]> = {};
        completedLog.sets?.forEach((set) => {
          if (!allSetsByExerciseName[set.exerciseName]) {
            allSetsByExerciseName[set.exerciseName] = [];
          }
          allSetsByExerciseName[set.exerciseName].push(set);
        });

        // Query flat representation of all exercises in active plan to update target weights
        const activePlan = updatedPlans.find((p) => p.isActive);

        for (const [exerciseName, sets] of Object.entries(allSetsByExerciseName)) {
          const completedSets = sets.filter((s) => s.isCompleted);
          if (completedSets.length === 0) continue;

          // Retrieve target properties from exercise metadata
          let targetExercise: Exercise | undefined;
          if (activePlan?.days) {
            for (const day of activePlan.days) {
              const matched = day.exercises?.find((e) => e.name === exerciseName);
              if (matched) {
                targetExercise = matched;
                break;
              }
            }
          }

          if (targetExercise) {
            const currentWeight = updatedExerciseWeights[exerciseName] ?? completedSets[0].weight ?? 20;
            
            // Apply Progressive Overload:
            // Ensure they completed every set of this exercise in the session and met/exceeded maxReps in all of them.
            const { nextWeight, isIncreased } = calculateNextWeight(
              targetExercise.targetMuscleGroup,
              sets, // Pass all sets (completed and uncompleted)
              targetExercise.maxReps,
              currentWeight
            );

            if (isIncreased) {
              updatedExerciseWeights[exerciseName] = nextWeight;
              targetExercise.targetWeight = nextWeight;
              targetExercise.updatedAt = new Date().toISOString();

              // Queue updated exercise parameters for sync
              useSyncStore.getState().addToQueue({
                table: 'exercises',
                action: 'UPDATE',
                payload: targetExercise,
              });
            }
          }

          // Evaluate Personal Records (PRs)
          const existingWeightPR = personalRecords.find(
            (pr) => pr.exerciseName === exerciseName && pr.prType === 'weight'
          );
          const existingRepsPR = personalRecords.find(
            (pr) => pr.exerciseName === exerciseName && pr.prType === 'reps'
          );
          const existingVolumePR = personalRecords.find(
            (pr) => pr.exerciseName === exerciseName && pr.prType === 'volume'
          );

          completedSets.forEach((set) => {
            const setWeight = set.weight ?? 0;
            const setReps = set.reps ?? 0;
            const setVolume = setWeight * setReps;

            // Check Weight PR
            if (!existingWeightPR || setWeight > existingWeightPR.value) {
              const newPR: PersonalRecord = {
                id: generateUUID(),
                userId,
                exerciseName,
                prType: 'weight',
                value: setWeight,
                loggedAt: now.toISOString(),
                workoutLogId: completedLog.id,
                exerciseSetId: set.id,
                createdAt: now.toISOString(),
                updatedAt: now.toISOString(),
              };
              newPRs.push(newPR);
            }

            // Check Reps PR
            if (!existingRepsPR || setReps > existingRepsPR.value) {
              const newPR: PersonalRecord = {
                id: generateUUID(),
                userId,
                exerciseName,
                prType: 'reps',
                value: setReps,
                loggedAt: now.toISOString(),
                workoutLogId: completedLog.id,
                exerciseSetId: set.id,
                createdAt: now.toISOString(),
                updatedAt: now.toISOString(),
              };
              newPRs.push(newPR);
            }

            // Check Volume PR
            if (!existingVolumePR || setVolume > existingVolumePR.value) {
              const newPR: PersonalRecord = {
                id: generateUUID(),
                userId,
                exerciseName,
                prType: 'volume',
                value: setVolume,
                loggedAt: now.toISOString(),
                workoutLogId: completedLog.id,
                exerciseSetId: set.id,
                createdAt: now.toISOString(),
                updatedAt: now.toISOString(),
              };
              newPRs.push(newPR);
            }
          });
        }

        // 2. Queue mutations to the sync Store
        const { addToQueue } = useSyncStore.getState();

        // Queue WorkoutLog (flattend)
        const { sets: loggedSets, cardioLogs: loggedCardio, ...flatWorkoutLog } = completedLog;
        addToQueue({
          table: 'workout_logs',
          action: 'INSERT',
          payload: flatWorkoutLog,
        });

        // Queue ExerciseSets individually
        if (loggedSets) {
          loggedSets.forEach((set) => {
            addToQueue({
              table: 'exercise_sets',
              action: 'INSERT',
              payload: set,
            });
          });
        }

        // Queue CardioLogs individually
        if (loggedCardio) {
          loggedCardio.forEach((cardio) => {
            addToQueue({
              table: 'cardio_logs',
              action: 'INSERT',
              payload: cardio,
            });
          });
        }

        // Queue new PR entries and merge into local state
        newPRs.forEach((pr) => {
          addToQueue({
            table: 'personal_records',
            action: 'INSERT',
            payload: pr,
          });
        });

        // Update local state stores
        set((state) => ({
          workoutLogs: [...state.workoutLogs, completedLog],
          personalRecords: [...state.personalRecords, ...newPRs],
          exerciseWeights: updatedExerciseWeights,
          plans: updatedPlans,
          activeWorkoutLog: null,
        }));

        get().stopRestTimer();

        // Run background syncing automatically
        syncService.sync();
      },

      cancelWorkout: () => {
        get().stopRestTimer();
        set({ activeWorkoutLog: null });
      },

      startRestTimer: (seconds) => {
        if (timerInterval) clearInterval(timerInterval);

        set({
          restTimer: {
            duration: seconds,
            isRunning: true,
            secondsRemaining: seconds,
            startTime: Date.now(),
          },
        });

        timerInterval = setInterval(() => {
          const { restTimer } = get();
          if (!restTimer.isRunning || restTimer.startTime === null) {
            if (timerInterval) {
              clearInterval(timerInterval);
              timerInterval = null;
            }
            return;
          }

          const elapsedSeconds = Math.round((Date.now() - restTimer.startTime) / 1000);
          const remaining = Math.max(0, restTimer.duration - elapsedSeconds);

          if (remaining === 0) {
            if (timerInterval) {
              clearInterval(timerInterval);
              timerInterval = null;
            }
            set({
              restTimer: {
                duration: 0,
                isRunning: false,
                secondsRemaining: 0,
                startTime: null,
              },
            });
          } else {
            set({
              restTimer: {
                ...restTimer,
                secondsRemaining: remaining,
              },
            });
          }
        }, 1000);
      },

      stopRestTimer: () => {
        if (timerInterval) {
          clearInterval(timerInterval);
          timerInterval = null;
        }
        set({
          restTimer: {
            duration: 0,
            isRunning: false,
            secondsRemaining: 0,
            startTime: null,
          },
        });
      },

      addWorkoutDay: (planId, name, focus, exercises, userId) => {
        const dayId = generateUUID();
        const now = new Date().toISOString();
        const { plans } = get();

        const plan = plans.find((p) => p.id === planId);
        if (!plan) return;

        const dayOrder = plan.days ? plan.days.length : 0;

        const mappedExercises: Exercise[] = exercises.map((e: any, index: number) => ({
          id: generateUUID(),
          userId,
          workoutDayId: dayId,
          name: e.name || '',
          category: (e.category as 'strength' | 'cardio') || 'strength',
          targetMuscleGroup: e.targetMuscleGroup,
          exerciseOrder: index,
          notes: focus || e.notes || '',
          targetSets: e.targetSets || 0,
          minReps: e.minReps || 0,
          maxReps: e.maxReps || 0,
          cardioDurationMinutes: e.cardioDurationMinutes,
          targetWeight: e.targetWeight,
          createdAt: now,
          updatedAt: now,
        }));

        const newDay: WorkoutDay = {
          id: dayId,
          userId,
          planId,
          name,
          dayOrder,
          createdAt: now,
          updatedAt: now,
          exercises: mappedExercises,
        };

        const updatedPlans = plans.map((p) => {
          if (p.id === planId) {
            return {
              ...p,
              days: [...(p.days || []), newDay],
              updatedAt: now,
            };
          }
          return p;
        });

        set({ plans: updatedPlans });

        const { addToQueue } = useSyncStore.getState();
        const { exercises: _, ...flatDay } = newDay;
        addToQueue({
          table: 'workout_days',
          action: 'INSERT',
          payload: flatDay,
        });

        mappedExercises.forEach((exercise) => {
          addToQueue({
            table: 'exercises',
            action: 'INSERT',
            payload: exercise,
          });
        });

        syncService.sync();
      },

      deleteWorkoutDay: (dayId) => {
        const { plans } = get();
        let dayToDelete: WorkoutDay | undefined;
        let parentPlanId: string | undefined;

        for (const plan of plans) {
          const matched = plan.days?.find((d) => d.id === dayId);
          if (matched) {
            dayToDelete = matched;
            parentPlanId = plan.id;
            break;
          }
        }

        if (!dayToDelete || !parentPlanId) return;

        const updatedPlans = plans.map((p) => {
          if (p.id === parentPlanId) {
            return {
              ...p,
              days: p.days?.filter((d) => d.id !== dayId) || [],
              updatedAt: new Date().toISOString(),
            };
          }
          return p;
        });

        set({ plans: updatedPlans });

        const { addToQueue } = useSyncStore.getState();

        addToQueue({
          table: 'workout_days',
          action: 'DELETE',
          payload: { id: dayId, userId: dayToDelete.userId },
        });

        if (dayToDelete.exercises) {
          dayToDelete.exercises.forEach((exercise) => {
            addToQueue({
              table: 'exercises',
              action: 'DELETE',
              payload: { id: exercise.id, userId: exercise.userId },
            });
          });
        }

        syncService.sync();
      },

      addExerciseToDay: (dayId, exerciseData, userId) => {
        const { plans } = get();
        let targetDay: WorkoutDay | undefined;
        let parentPlanId: string | undefined;

        for (const plan of plans) {
          const matched = plan.days?.find((d) => d.id === dayId);
          if (matched) {
            targetDay = matched;
            parentPlanId = plan.id;
            break;
          }
        }

        if (!targetDay || !parentPlanId) return;

        const nextOrder = targetDay.exercises ? targetDay.exercises.length : 0;
        const now = new Date().toISOString();

        const newExercise: Exercise = {
          id: generateUUID(),
          userId,
          workoutDayId: dayId,
          name: exerciseData.name || '',
          category: (exerciseData.category as 'strength' | 'cardio') || 'strength',
          targetMuscleGroup: exerciseData.targetMuscleGroup,
          exerciseOrder: nextOrder,
          notes: exerciseData.notes || '',
          targetSets: exerciseData.targetSets || 0,
          minReps: exerciseData.minReps || 0,
          maxReps: exerciseData.maxReps || 0,
          cardioDurationMinutes: exerciseData.cardioDurationMinutes,
          targetWeight: exerciseData.targetWeight,
          createdAt: now,
          updatedAt: now,
        };

        const updatedPlans = plans.map((p) => {
          if (p.id === parentPlanId) {
            return {
              ...p,
              days: p.days?.map((d) => {
                if (d.id === dayId) {
                  return {
                    ...d,
                    exercises: [...(d.exercises || []), newExercise],
                    updatedAt: now,
                  };
                }
                return d;
              }) || [],
              updatedAt: now,
            };
          }
          return p;
        });

        set({ plans: updatedPlans });

        const { addToQueue } = useSyncStore.getState();
        addToQueue({
          table: 'exercises',
          action: 'INSERT',
          payload: newExercise,
        });

        syncService.sync();
      },

      deleteExerciseFromDay: (dayId, exerciseId) => {
        const { plans } = get();
        let targetDay: WorkoutDay | undefined;
        let parentPlanId: string | undefined;

        for (const plan of plans) {
          const matched = plan.days?.find((d) => d.id === dayId);
          if (matched) {
            targetDay = matched;
            parentPlanId = plan.id;
            break;
          }
        }

        if (!targetDay || !parentPlanId) return;

        let targetExercise: Exercise | undefined;
        if (targetDay.exercises) {
          targetExercise = targetDay.exercises.find((e) => e.id === exerciseId);
        }
        if (!targetExercise) return;

        const now = new Date().toISOString();

        const updatedPlans = plans.map((p) => {
          if (p.id === parentPlanId) {
            return {
              ...p,
              days: p.days?.map((d) => {
                if (d.id === dayId) {
                  return {
                    ...d,
                    exercises: d.exercises?.filter((e) => e.id !== exerciseId) || [],
                    updatedAt: now,
                  };
                }
                return d;
              }) || [],
              updatedAt: now,
            };
          }
          return p;
        });

        set({ plans: updatedPlans });

        const { addToQueue } = useSyncStore.getState();
        addToQueue({
          table: 'exercises',
          action: 'DELETE',
          payload: { id: exerciseId, userId: targetExercise.userId },
        });

        syncService.sync();
      },
    }),
    {
      name: 'workout-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Prevent persisting restTimer since it is transient UI state
      partialize: (state) => ({
        plans: state.plans,
        workoutLogs: state.workoutLogs,
        personalRecords: state.personalRecords,
        activeWorkoutLog: state.activeWorkoutLog,
        exerciseWeights: state.exerciseWeights,
      }),
    }
  )
);
