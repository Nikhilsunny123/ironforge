import NetInfo from '@react-native-community/netinfo';
import { supabase } from './supabase';
import { useSyncStore } from '../store/syncStore';
import { SyncQueueItem } from '../types';

// Helper to convert camelCase keys to snake_case
export const camelToSnake = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(camelToSnake);
  }
  if (typeof obj === 'object') {
    // Avoid converting Date objects
    if (obj instanceof Date) return obj;
    const n: any = {};
    for (const key of Object.keys(obj)) {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      n[snakeKey] = camelToSnake(obj[key]);
    }
    return n;
  }
  return obj;
};

// Helper to convert snake_case keys to camelCase
export const snakeToCamel = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(snakeToCamel);
  }
  if (typeof obj === 'object') {
    if (obj instanceof Date) return obj;
    const n: any = {};
    for (const key of Object.keys(obj)) {
      const camelKey = key.replace(/([-_][a-z])/g, (group) =>
        group.toUpperCase().replace('-', '').replace('_', '')
      );
      n[camelKey] = snakeToCamel(obj[key]);
    }
    return n;
  }
  return obj;
};

// Check if an error is network-related (indicating we are offline or server is temporarily unreachable)
const isNetworkError = (error: any): boolean => {
  if (!error) return false;
  const errMsg = (error.message || '').toLowerCase();
  return (
    error.status === 0 ||
    error.code === 'CONNECTION_FAILURE' ||
    errMsg.includes('fetch') ||
    errMsg.includes('network') ||
    errMsg.includes('failed to fetch') ||
    errMsg.includes('network request failed') ||
    errMsg.includes('offline')
  );
};

class SyncService {
  private isListenerInitialized = false;

  /**
   * Initializes the NetInfo listener to trigger syncing automatically when coming online.
   */
  public initSyncListener() {
    if (this.isListenerInitialized) return;
    this.isListenerInitialized = true;

    NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        console.log('Device is online. Triggering background sync...');
        this.sync().catch((err) => {
          console.error('Background sync failed:', err);
        });
      }
    });
  }

  /**
   * Processes the sync queue in sequential order.
   */
  public async sync(): Promise<void> {
    // 1. Quick initial sync check to avoid unnecessary fetch if empty or already syncing
    const initialState = useSyncStore.getState();
    if (initialState.isSyncing || initialState.queue.length === 0) {
      return;
    }

    // 2. Perform async checks (fetch network and auth status)
    const netState = await NetInfo.fetch();
    console.log(`[Sync] netState detected: ${JSON.stringify(netState)}`);
    if (!netState.isConnected || netState.isInternetReachable === false) {
      console.log('Sync aborted: device is offline.');
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) {
      console.log('Sync aborted: User is not authenticated in Supabase.');
      return;
    }

    // 3. Double-checked locking to prevent concurrent executions and stale queue processing
    const currentState = useSyncStore.getState();
    if (currentState.isSyncing || currentState.queue.length === 0) {
      return;
    }

    const { removeFromQueue, setSyncing, setError } = currentState;
    const freshQueue = currentState.queue;

    setSyncing(true);
    setError(null);

    console.log(`Starting sync of ${freshQueue.length} items...`);

    try {
      // Process items sequentially to preserve dependency/foreign key order
      for (const item of freshQueue) {
        let success = false;
        let isRetryable = false;

        // Migrate guest 'default-user' IDs to the active authenticated UUID if needed
        if (item.payload) {
          if (item.payload.userId === 'default-user') {
            item.payload.userId = session.user.id;
          }
          if (item.payload.user_id === 'default-user') {
            item.payload.user_id = session.user.id;
          }
        }

        try {
          if (item.action === 'INSERT' || item.action === 'UPDATE') {
            const isSettings = item.table === 'settings';
            const idKey = isSettings ? 'user_id' : 'id';
            const idVal = isSettings ? item.payload.userId : item.payload.id;

            // 1. Last-Write-Wins check using updated_at timestamp
            const { data: serverRecord, error: fetchError } = await supabase
              .from(item.table)
              .select('updated_at')
              .eq(idKey, idVal)
              .maybeSingle();

            if (fetchError && isNetworkError(fetchError)) {
              throw fetchError; // Bubble network errors up to pause sync
            }

            let shouldWrite = true;
            if (serverRecord && serverRecord.updated_at) {
              const serverTime = new Date(serverRecord.updated_at).getTime();
              // Use payload updated_at or queue item timestamp as fallback
              const localTime = new Date(item.payload.updatedAt || item.timestamp).getTime();

              if (serverTime > localTime) {
                shouldWrite = false;
                console.log(
                  `[LWW] Table ${item.table} ID ${idVal} - Server is newer. Skipping local write.`
                );
              }
            }

            // 2. Perform upsert if client version is newer or record doesn't exist
            if (shouldWrite) {
              const snakePayload = camelToSnake(item.payload);
              // Ensure system properties like updated_at exist and are set correctly
              if (!snakePayload.updated_at) {
                snakePayload.updated_at = new Date().toISOString();
              }
              const upsertOptions = isSettings ? { onConflict: 'user_id' } : undefined;
              const { error: upsertError } = await supabase
                .from(item.table)
                .upsert(snakePayload, upsertOptions);

              if (upsertError) {
                if (isNetworkError(upsertError)) {
                  throw upsertError;
                }
                console.error(`[Sync Failure] Upsert to ${item.table} failed:`, upsertError);
              } else {
                success = true;
              }
            } else {
              success = true; // Mark as success since we skipped due to newer server record
            }
          } else if (item.action === 'DELETE') {
            // Delete action
            const isSettings = item.table === 'settings';
            const idKey = isSettings ? 'user_id' : 'id';
            const idVal = isSettings ? item.payload.userId : item.payload.id;
            
            const { error: deleteError } = await supabase
              .from(item.table)
              .delete()
              .eq(idKey, idVal);

            if (deleteError) {
              if (isNetworkError(deleteError)) {
                throw deleteError;
              }
              console.error(`[Sync Failure] Delete from ${item.table} failed:`, deleteError);
            } else {
              success = true;
            }
          }
        } catch (opErr: any) {
          if (isNetworkError(opErr)) {
            console.log('Network connection lost during sync. Halting sync process.');
            setError('Network error: Sync will resume when online.');
            isRetryable = true;
          } else {
            console.error(`Unexpected sync error on queue item ${item.id}:`, opErr);
          }
        }

        if (success) {
          removeFromQueue(item.id);
        } else if (isRetryable) {
          break;
        } else {
          console.warn(`Removing invalid queue item ${item.id} (${item.table}) from queue.`);
          removeFromQueue(item.id);
        }
      }
    } catch (globalErr: any) {
      console.error('Global error during sync operation:', globalErr);
      setError(globalErr.message || 'Sync failed.');
    } finally {
      setSyncing(false);
      console.log('Sync sequence finished. Current queue size:', useSyncStore.getState().queue.length);
    }
  }
}

export const syncService = new SyncService();

// Auto-initialize the listener on file import
syncService.initSyncListener();
