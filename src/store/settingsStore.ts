import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Settings } from '../types';
import { useSyncStore, generateUUID } from './syncStore';
import { syncService } from '../services/syncService';

interface SettingsState {
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => void;
}

const defaultSettings = (userId: string): Settings => ({
  userId,
  theme: 'dark',
  unitSystem: 'metric',
  reminderMorningTime: '08:00',
  reminderEveningTime: '19:00',
  isNotificationsEnabled: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: defaultSettings('default-user'),

      updateSettings: (updates) => {
        const now = new Date().toISOString();
        set((state) => {
          const updatedSettings = {
            ...state.settings,
            ...updates,
            updatedAt: now,
          };

          // Queue change for sync
          useSyncStore.getState().addToQueue({
            table: 'settings',
            action: 'UPDATE',
            payload: updatedSettings,
          });

          // Trigger background sync
          syncService.sync();

          return { settings: updatedSettings };
        });
      },
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
