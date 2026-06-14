import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SyncQueueItem } from '../types';

// Helper to generate UUIDs locally without external dependencies
export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export interface SyncState {
  queue: SyncQueueItem[];
  isSyncing: boolean;
  error: string | null;
  addToQueue: (item: Omit<SyncQueueItem, 'id' | 'timestamp'>) => void;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
  setSyncing: (isSyncing: boolean) => void;
  setError: (error: string | null) => void;
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set) => ({
      queue: [],
      isSyncing: false,
      error: null,
      addToQueue: (item) => {
        const newItem: SyncQueueItem = {
          ...item,
          id: generateUUID(),
          timestamp: new Date().toISOString(),
        };
        set((state) => ({
          queue: [...state.queue, newItem],
        }));
      },
      removeFromQueue: (id) => {
        set((state) => ({
          queue: state.queue.filter((item) => item.id !== id),
        }));
      },
      clearQueue: () => {
        set({ queue: [] });
      },
      setSyncing: (isSyncing) => {
        set({ isSyncing });
      },
      setError: (error) => {
        set({ error });
      },
    }),
    {
      name: 'sync-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // We only want to persist the queue, not the transient syncing status or errors
      partialize: (state) => ({ queue: state.queue }),
    }
  )
);
