import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { useWorkoutStore } from './workoutStore';
import { useMeasurementStore } from './measurementStore';
import { useSyncStore } from './syncStore';
import { useSettingsStore } from './settingsStore';
import { syncService } from '../services/syncService';

import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

WebBrowser.maybeCompleteAuthSession();

const extractParamsFromUrl = (url: string) => {
  const params: { [key: string]: string } = {};
  const queryPart = url.split('#')[1] || url.split('?')[1];
  if (queryPart) {
    queryPart.split('&').forEach((param) => {
      const [key, val] = param.split('=');
      if (key && val) {
        params[key] = decodeURIComponent(val);
      }
    });
  }
  return params;
};

export interface AuthState {
  user: SupabaseUser | null;
  isGuest: boolean;
  isLoading: boolean;
  error: string | null;

  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<any>;
  continueAsGuest: () => void;
  signOut: () => Promise<void>;
  migrateGuestData: (newUserId: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isGuest: false,
      isLoading: false,
      error: null,

      signIn: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (error) throw error;
          
          if (data.user) {
            set({ user: data.user, isGuest: false });
          }
        } catch (err: any) {
          set({ error: err.message || 'Failed to sign in' });
          throw err;
        } finally {
          set({ isLoading: false });
        }
      },

      signUp: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
          });
          if (error) throw error;

          if (data.user) {
            set({ user: data.user, isGuest: false });
          }
        } catch (err: any) {
          set({ error: err.message || 'Failed to sign up' });
          throw err;
        } finally {
          set({ isLoading: false });
        }
      },

      signInWithGoogle: async () => {
        set({ isLoading: true, error: null });
        try {
          const redirectUrl = Linking.createURL('auth-callback');
          const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: redirectUrl,
              skipBrowserRedirect: true,
            },
          });
          if (error) throw error;

          if (data?.url) {
            const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
            if (result.type === 'success' && result.url) {
              const params = extractParamsFromUrl(result.url);
              const { access_token, refresh_token } = params;
              if (access_token && refresh_token) {
                const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
                  access_token,
                  refresh_token,
                });
                if (sessionError) throw sessionError;
                if (sessionData.user) {
                  set({ user: sessionData.user, isGuest: false });
                }
                return sessionData;
              }
            }
          }
          return null;
        } catch (err: any) {
          set({ error: err.message || 'Failed to sign in with Google' });
          throw err;
        } finally {
          set({ isLoading: false });
        }
      },

      continueAsGuest: () => {
        set({ isGuest: true, user: null, error: null });
        // Initialize default plans for guest mode if none exist
        useWorkoutStore.getState().initDefaultPlans('default-user');
      },

      signOut: async () => {
        set({ isLoading: true, error: null });
        try {
          await supabase.auth.signOut();
          
          // Reset Auth Store state
          set({ user: null, isGuest: false });

          // Reset Workout Store
          useWorkoutStore.setState({
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
          });

          // Reset Measurement Store
          useMeasurementStore.setState({
            measurements: [],
            photos: [],
          });

          // Reset Settings Store
          useSettingsStore.setState({
            settings: {
              userId: 'default-user',
              theme: 'dark',
              unitSystem: 'metric',
              reminderMorningTime: '08:00',
              reminderEveningTime: '19:00',
              isNotificationsEnabled: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          });

          // Clear offline Sync Queue
          useSyncStore.getState().clearQueue();
        } catch (err: any) {
          set({ error: err.message || 'Failed to sign out' });
          throw err;
        } finally {
          set({ isLoading: false });
        }
      },

      migrateGuestData: async (newUserId: string) => {
        // Wait for store hydration if not hydrated yet
        while (useWorkoutStore.persist && !useWorkoutStore.persist.hasHydrated()) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
        while (useMeasurementStore.persist && !useMeasurementStore.persist.hasHydrated()) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }

        const workoutState = useWorkoutStore.getState();
        const measurementState = useMeasurementStore.getState();
        const syncState = useSyncStore.getState();
        const settingsState = useSettingsStore.getState();

        const hasLogs = workoutState.workoutLogs.some((log) => log.userId === 'default-user');
        const hasMeasurements = measurementState.measurements.some((m) => m.userId === 'default-user');

        if (!hasLogs && !hasMeasurements) {
          return;
        }

        console.log(`Migrating guest data from default-user to ${newUserId}...`);

        // 1. Migrate settings
        if (settingsState.settings && settingsState.settings.userId === 'default-user') {
          const updatedSettings = {
            ...settingsState.settings,
            userId: newUserId,
            updatedAt: new Date().toISOString(),
          };
          useSettingsStore.setState({ settings: updatedSettings });
          syncState.addToQueue({
            table: 'settings',
            action: 'UPDATE',
            payload: updatedSettings,
          });
        }

        // 2. Migrate plans (including days & exercises)
        const updatedPlans = workoutState.plans.map((plan) => {
          if (plan.userId === 'default-user') {
            const updatedDays = plan.days?.map((day) => {
              if (day.userId === 'default-user') {
                const updatedExercises = day.exercises?.map((ex) => {
                  if (ex.userId === 'default-user') {
                    const newEx = { ...ex, userId: newUserId, updatedAt: new Date().toISOString() };
                    syncState.addToQueue({
                      table: 'exercises',
                      action: 'INSERT',
                      payload: newEx,
                    });
                    return newEx;
                  }
                  return ex;
                });

                const newDay = { ...day, userId: newUserId, exercises: updatedExercises, updatedAt: new Date().toISOString() };
                syncState.addToQueue({
                  table: 'workout_days',
                  action: 'INSERT',
                  payload: {
                    id: newDay.id,
                    userId: newUserId,
                    planId: newDay.planId,
                    name: newDay.name,
                    dayOrder: newDay.dayOrder,
                    createdAt: newDay.createdAt,
                    updatedAt: newDay.updatedAt,
                  },
                });
                return newDay;
              }
              return day;
            });

            const newPlan = { ...plan, userId: newUserId, days: updatedDays, updatedAt: new Date().toISOString() };
            syncState.addToQueue({
              table: 'workout_plans',
              action: 'INSERT',
              payload: {
                id: newPlan.id,
                userId: newUserId,
                name: newPlan.name,
                description: newPlan.description,
                isActive: newPlan.isActive,
                createdAt: newPlan.createdAt,
                updatedAt: newPlan.updatedAt,
              },
            });
            return newPlan;
          }
          return plan;
        });

        // 3. Migrate workout logs
        const updatedWorkoutLogs = workoutState.workoutLogs.map((log) => {
          if (log.userId === 'default-user') {
            const updatedSets = log.sets?.map((set) => {
              if (set.userId === 'default-user') {
                const newSet = { ...set, userId: newUserId, updatedAt: new Date().toISOString() };
                syncState.addToQueue({
                  table: 'exercise_sets',
                  action: 'INSERT',
                  payload: newSet,
                });
                return newSet;
              }
              return set;
            });

            const updatedCardio = log.cardioLogs?.map((cardio) => {
              if (cardio.userId === 'default-user') {
                const newCardio = { ...cardio, userId: newUserId, updatedAt: new Date().toISOString() };
                syncState.addToQueue({
                  table: 'cardio_logs',
                  action: 'INSERT',
                  payload: newCardio,
                });
                return newCardio;
              }
              return cardio;
            });

            const newLog = {
              ...log,
              userId: newUserId,
              sets: updatedSets,
              cardioLogs: updatedCardio,
              updatedAt: new Date().toISOString(),
            };

            syncState.addToQueue({
              table: 'workout_logs',
              action: 'INSERT',
              payload: {
                id: newLog.id,
                userId: newUserId,
                workoutDayId: newLog.workoutDayId,
                name: newLog.name,
                startedAt: newLog.startedAt,
                completedAt: newLog.completedAt,
                durationSeconds: newLog.durationSeconds,
                notes: newLog.notes,
                createdAt: newLog.createdAt,
                updatedAt: newLog.updatedAt,
              },
            });

            return newLog;
          }
          return log;
        });

        // 4. Migrate personal records
        const updatedPRs = workoutState.personalRecords.map((pr) => {
          if (pr.userId === 'default-user') {
            const newPR = { ...pr, userId: newUserId, updatedAt: new Date().toISOString() };
            syncState.addToQueue({
              table: 'personal_records',
              action: 'INSERT',
              payload: newPR,
            });
            return newPR;
          }
          return pr;
        });

        // 5. Migrate active workout log if one is in progress
        let updatedActiveWorkoutLog = workoutState.activeWorkoutLog;
        if (updatedActiveWorkoutLog && updatedActiveWorkoutLog.userId === 'default-user') {
          const updatedSets = updatedActiveWorkoutLog.sets?.map((set) =>
            set.userId === 'default-user' ? { ...set, userId: newUserId } : set
          );
          const updatedCardio = updatedActiveWorkoutLog.cardioLogs?.map((cardio) =>
            cardio.userId === 'default-user' ? { ...cardio, userId: newUserId } : cardio
          );
          updatedActiveWorkoutLog = {
            ...updatedActiveWorkoutLog,
            userId: newUserId,
            sets: updatedSets,
            cardioLogs: updatedCardio,
            updatedAt: new Date().toISOString(),
          };
        }

        // Apply state updates to Workout Store
        useWorkoutStore.setState({
          plans: updatedPlans,
          workoutLogs: updatedWorkoutLogs,
          personalRecords: updatedPRs,
          activeWorkoutLog: updatedActiveWorkoutLog,
        });

        // 6. Migrate measurements
        const updatedMeasurements = measurementState.measurements.map((m) => {
          if (m.userId === 'default-user') {
            const newM = { ...m, userId: newUserId, updatedAt: new Date().toISOString() };
            syncState.addToQueue({
              table: 'body_measurements',
              action: 'INSERT',
              payload: newM,
            });
            return newM;
          }
          return m;
        });

        // 7. Migrate progress photos
        const updatedPhotos = measurementState.photos.map((p) => {
          if (p.userId === 'default-user') {
            const newP = { ...p, userId: newUserId, updatedAt: new Date().toISOString() };
            syncState.addToQueue({
              table: 'progress_photos',
              action: 'INSERT',
              payload: newP,
            });
            return newP;
          }
          return p;
        });

        // Apply state updates to Measurement Store
        useMeasurementStore.setState({
          measurements: updatedMeasurements,
          photos: updatedPhotos,
        });

        // Trigger background sync immediately
        await syncService.sync();
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        isGuest: state.isGuest,
      }),
    }
  )
);

// Subscribe to Supabase auth events to handle state transitions automatically
supabase.auth.onAuthStateChange((event, session) => {
  const user = session?.user ?? null;
  const currentStore = useAuthStore.getState();

  useAuthStore.setState({
    user,
    // If we have a valid authenticated user, we are no longer in guest mode
    isGuest: user ? false : currentStore.isGuest,
    isLoading: false,
  });

  if (user && (event === 'SIGNED_IN' || event === 'USER_UPDATED')) {
    currentStore.migrateGuestData(user.id).catch((err) => {
      console.error('Failed to migrate guest data on auth state change:', err);
    });
  }
});
