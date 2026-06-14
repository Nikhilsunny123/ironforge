import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BodyMeasurement, ProgressPhoto } from '../types';
import { useSyncStore, generateUUID } from './syncStore';
import { syncService } from '../services/syncService';

export interface MeasurementState {
  measurements: BodyMeasurement[];
  photos: ProgressPhoto[];

  // Actions
  addMeasurement: (
    measurement: Omit<BodyMeasurement, 'id' | 'createdAt' | 'updatedAt'>
  ) => void;
  updateMeasurement: (id: string, updates: Partial<BodyMeasurement>) => void;
  deleteMeasurement: (id: string) => void;
  addPhoto: (photo: Omit<ProgressPhoto, 'id' | 'createdAt' | 'updatedAt'>) => void;
  deletePhoto: (id: string) => void;
}

export const useMeasurementStore = create<MeasurementState>()(
  persist(
    (set, get) => ({
      measurements: [],
      photos: [],

      addMeasurement: (measurement) => {
        const id = generateUUID();
        const now = new Date().toISOString();
        const newMeasurement: BodyMeasurement = {
          ...measurement,
          id,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          measurements: [newMeasurement, ...state.measurements],
        }));

        // Queue for offline sync
        useSyncStore.getState().addToQueue({
          table: 'body_measurements',
          action: 'INSERT',
          payload: newMeasurement,
        });

        // Trigger sync service
        syncService.sync();
      },

      updateMeasurement: (id, updates) => {
        const now = new Date().toISOString();
        let updatedRecord: BodyMeasurement | null = null;

        set((state) => {
          const updated = state.measurements.map((m) => {
            if (m.id === id) {
              updatedRecord = {
                ...m,
                ...updates,
                updatedAt: now,
              };
              return updatedRecord;
            }
            return m;
          });

          return { measurements: updated };
        });

        // Queue updated record for offline sync
        if (updatedRecord) {
          useSyncStore.getState().addToQueue({
            table: 'body_measurements',
            action: 'UPDATE',
            payload: updatedRecord,
          });

          syncService.sync();
        }
      },

      deleteMeasurement: (id) => {
        set((state) => ({
          measurements: state.measurements.filter((m) => m.id !== id),
        }));

        // Queue deletion for offline sync
        useSyncStore.getState().addToQueue({
          table: 'body_measurements',
          action: 'DELETE',
          payload: { id },
        });

        syncService.sync();
      },

      addPhoto: (photo) => {
        const id = generateUUID();
        const now = new Date().toISOString();
        const newPhoto: ProgressPhoto = {
          ...photo,
          id,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          photos: [newPhoto, ...state.photos],
        }));

        // Queue progress photo for offline sync
        useSyncStore.getState().addToQueue({
          table: 'progress_photos',
          action: 'INSERT',
          payload: newPhoto,
        });

        syncService.sync();
      },

      deletePhoto: (id) => {
        set((state) => ({
          photos: state.photos.filter((p) => p.id !== id),
        }));

        // Queue progress photo deletion for offline sync
        useSyncStore.getState().addToQueue({
          table: 'progress_photos',
          action: 'DELETE',
          payload: { id },
        });

        syncService.sync();
      },
    }),
    {
      name: 'measurement-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
