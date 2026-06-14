const fs = require('fs');
const path = require('path');
const Module = require('module');
const ts = require('typescript');

// --- COLOR OUTPUT CONFIGURATION ---
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  bold: '\x1b[1m',
};

let passCount = 0;
let failCount = 0;
const testResults = [];

function assert(condition, message) {
  if (condition) {
    passCount++;
    console.log(`${colors.green}[PASS]${colors.reset} ${message}`);
    testResults.push({ message, status: 'PASS' });
  } else {
    failCount++;
    console.log(`${colors.red}[FAIL]${colors.reset} ${message}`);
    testResults.push({ message, status: 'FAIL' });
  }
}

function section(name) {
  console.log(`\n${colors.bold}${colors.cyan}=== ${name} ===${colors.reset}`);
}

// --- MOCK IMPLEMENTATIONS ---
const storage = {};
const mockAsyncStorage = {
  getItem: async (key) => storage[key] || null,
  setItem: async (key, value) => {
    storage[key] = String(value);
  },
  removeItem: async (key) => {
    delete storage[key];
  },
  clear: async () => {
    for (const key in storage) {
      delete storage[key];
    }
  },
};

let netInfoConnected = true;
const netInfoListeners = [];
const mockNetInfo = {
  fetch: async () => ({
    isConnected: netInfoConnected,
    isInternetReachable: netInfoConnected,
  }),
  addEventListener: (callback) => {
    netInfoListeners.push(callback);
    callback({ isConnected: netInfoConnected, isInternetReachable: netInfoConnected });
    return () => {
      const index = netInfoListeners.indexOf(callback);
      if (index > -1) netInfoListeners.splice(index, 1);
    };
  },
  setConnected: (connected) => {
    netInfoConnected = connected;
    netInfoListeners.forEach((cb) =>
      cb({ isConnected: connected, isInternetReachable: connected })
    );
  },
};

let currentSession = null;
const authChangeListeners = [];
const dbStore = {};

const mockAuth = {
  signInWithPassword: async ({ email, password }) => {
    const user = { id: 'new-authenticated-user-uuid', email };
    currentSession = { user, token: 'mock-session-token' };
    authChangeListeners.forEach((cb) => cb('SIGNED_IN', currentSession));
    return { data: { user }, error: null };
  },
  signUp: async ({ email, password }) => {
    const user = { id: 'new-authenticated-user-uuid', email };
    currentSession = { user, token: 'mock-session-token' };
    authChangeListeners.forEach((cb) => cb('SIGNED_IN', currentSession));
    return { data: { user }, error: null };
  },
  signInWithOAuth: async ({ provider }) => {
    const user = { id: 'new-authenticated-user-uuid', email: 'oauth@gmail.com' };
    currentSession = { user, token: 'mock-session-token' };
    authChangeListeners.forEach((cb) => cb('SIGNED_IN', currentSession));
    return { data: { provider }, error: null };
  },
  signOut: async () => {
    currentSession = null;
    authChangeListeners.forEach((cb) => cb('SIGNED_OUT', null));
    return { error: null };
  },
  getSession: async () => ({ data: { session: currentSession }, error: null }),
  onAuthStateChange: (callback) => {
    authChangeListeners.push(callback);
    callback('INITIAL_SESSION', currentSession);
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            const index = authChangeListeners.indexOf(callback);
            if (index > -1) authChangeListeners.splice(index, 1);
          },
        },
      },
    };
  },
};

const mockSupabaseQueryBuilder = (table) => {
  if (!dbStore[table]) dbStore[table] = [];
  let filterKey = null;
  let filterVal = null;
  const builder = {
    select: (cols) => builder,
    eq: (key, val) => {
      filterKey = key;
      filterVal = val;
      return builder;
    },
    maybeSingle: async () => {
      const match = dbStore[table].find((r) => r[filterKey] === filterVal);
      return { data: match || null, error: null };
    },
    upsert: async (payload, options) => {
      const idKey = table === 'settings' ? 'user_id' : 'id';
      const idVal = payload[idKey];
      const idx = dbStore[table].findIndex((r) => r[idKey] === idVal);
      if (idx > -1) {
        dbStore[table][idx] = { ...dbStore[table][idx], ...payload };
      } else {
        dbStore[table].push(payload);
      }
      return { data: payload, error: null };
    },
    delete: () => ({
      eq: async (key, val) => {
        dbStore[table] = dbStore[table].filter((r) => r[key] !== val);
        return { error: null };
      },
    }),
  };
  return builder;
};

const mockSupabase = {
  auth: mockAuth,
  from: (table) => mockSupabaseQueryBuilder(table),
};

const mockExpoNotifications = {
  setNotificationHandler: () => {},
  scheduleNotificationAsync: async () => {},
  cancelAllScheduledNotificationsAsync: async () => {},
  getPermissionsAsync: async () => ({ status: 'granted' }),
  requestPermissionsAsync: async () => ({ status: 'granted' }),
};

// --- DYNAMIC MODULE RESOLUTION AND COMPILATION ---
const originalResolveFilename = Module._resolveFilename;
const originalRequire = Module.prototype.require;

Module._resolveFilename = function (request, parent, isMain, options) {
  try {
    return originalResolveFilename.apply(this, arguments);
  } catch (err) {
    const extensions = ['.ts', '.tsx'];
    for (const ext of extensions) {
      try {
        return originalResolveFilename(request + ext, parent, isMain, options);
      } catch (e) {}
    }
    for (const ext of extensions) {
      try {
        return originalResolveFilename(request + '/index' + ext, parent, isMain, options);
      } catch (e) {}
    }
    throw err;
  }
};

Module.prototype.require = function (id) {
  if (id === 'react-native') {
    return { Platform: { OS: 'ios' } };
  }
  if (id === '@react-native-async-storage/async-storage') {
    return mockAsyncStorage;
  }
  if (id === '@react-native-community/netinfo') {
    return mockNetInfo;
  }
  if (id === '@supabase/supabase-js') {
    return {
      createClient: () => mockSupabase,
    };
  }
  if (id === 'expo-notifications') {
    return mockExpoNotifications;
  }
  if (id === 'expo-web-browser') {
    return {
      maybeCompleteAuthSession: () => {},
      openAuthSessionAsync: async (url, redirectUrl) => ({ type: 'cancel' }),
    };
  }
  if (id === 'expo-linking') {
    return {
      createURL: (path) => `ironforge://${path}`,
      parse: (url) => ({ hostname: '', path: '', queryParams: {} }),
      addEventListener: (type, handler) => ({ remove: () => {} }),
      getInitialURL: async () => null,
    };
  }
  return originalRequire.apply(this, arguments);
};

require.extensions['.ts'] = function (module, filename) {
  const content = fs.readFileSync(filename, 'utf8');
  const result = ts.transpileModule(content, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
      skipLibCheck: true,
    },
    filename: filename,
  });
  module._compile(result.outputText, filename);
};

require.extensions['.tsx'] = require.extensions['.ts'];

// --- IMPORT APPLICATION STORES & SERVICES ---
const { useAuthStore } = require('../src/store/authStore');
const { useWorkoutStore } = require('../src/store/workoutStore');
const { useMeasurementStore } = require('../src/store/measurementStore');
const { useSettingsStore } = require('../src/store/settingsStore');
const { useSyncStore } = require('../src/store/syncStore');
const { syncService } = require('../src/services/syncService');

async function waitForHydration() {
  while (useWorkoutStore.persist && !useWorkoutStore.persist.hasHydrated()) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  while (useMeasurementStore.persist && !useMeasurementStore.persist.hasHydrated()) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  while (useAuthStore.persist && !useAuthStore.persist.hasHydrated()) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  while (useSettingsStore.persist && !useSettingsStore.persist.hasHydrated()) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  while (useSyncStore.persist && !useSyncStore.persist.hasHydrated()) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

async function resetAll() {
  for (const k in storage) delete storage[k];
  
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
  
  useMeasurementStore.setState({
    measurements: [],
    photos: [],
  });

  useAuthStore.setState({
    user: null,
    isGuest: false,
    isLoading: false,
    error: null,
  });

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

  useSyncStore.setState({
    queue: [],
    isSyncing: false,
    error: null,
  });

  for (const k in dbStore) {
    dbStore[k] = [];
  }

  currentSession = null;
  netInfoConnected = true;

  await waitForHydration();
}

// --- TEST SUITE EXECUTION ---
async function runTests() {
  console.log(`${colors.bold}${colors.yellow}====================================================`);
  console.log(`          IRONFORGE CORE LOGICAL TEST RUNNER`);
  console.log(`====================================================${colors.reset}`);

  try {
    // ----------------------------------------------------
    // FLOW 1: Guest Mode Initialization
    // ----------------------------------------------------
    section('Flow 1: Guest Mode Initialization');
    await resetAll();

    assert(useWorkoutStore.getState().plans.length === 0, 'Initially, plans list is empty.');

    // Trigger continueAsGuest
    useAuthStore.getState().continueAsGuest();
    await waitForHydration();

    const wState1 = useWorkoutStore.getState();
    const aState1 = useAuthStore.getState();
    const sState1 = useSettingsStore.getState();

    assert(aState1.isGuest === true, 'authStore.isGuest is set to true.');
    assert(aState1.user === null, 'authStore.user is null in guest mode.');
    assert(wState1.plans.length === 1, 'Default workout plan is initialized.');

    const defaultPlan = wState1.plans[0];
    assert(defaultPlan.userId === 'default-user', 'Default plan userId is set to "default-user".');
    assert(defaultPlan.name === 'Push / Pull / Legs (PPL) Split', 'Default plan name matches PPL Split.');
    assert(defaultPlan.days && defaultPlan.days.length === 7, 'Default plan contains 7 workout days.');

    let allUserIdsGuest = true;
    defaultPlan.days.forEach((day) => {
      if (day.userId !== 'default-user') allUserIdsGuest = false;
      day.exercises?.forEach((ex) => {
        if (ex.userId !== 'default-user') allUserIdsGuest = false;
      });
    });
    assert(allUserIdsGuest, 'All days and exercise sub-records are set to "default-user".');
    assert(sState1.settings.userId === 'default-user', 'Settings store userId is "default-user".');

    // ----------------------------------------------------
    // FLOW 2: Active Session Logging
    // ----------------------------------------------------
    section('Flow 2: Active Session Logging');
    await resetAll();
    useAuthStore.getState().continueAsGuest();
    await waitForHydration();

    let wState2 = useWorkoutStore.getState();
    const pushADay = wState2.plans[0].days.find((d) => d.name === 'Push A');
    assert(pushADay !== undefined, 'Push A day exists in default program.');

    // Start workout session
    useWorkoutStore.getState().startWorkout(pushADay, 'default-user');
    wState2 = useWorkoutStore.getState();
    assert(wState2.activeWorkoutLog !== null, 'Active workout log is created and not null.');
    assert(wState2.activeWorkoutLog.name === 'Push A', 'Active workout log name matches "Push A".');
    assert(wState2.activeWorkoutLog.userId === 'default-user', 'Active workout log userId is "default-user".');

    const firstSet = wState2.activeWorkoutLog.sets[0];
    assert(firstSet !== undefined, 'First set in the workout exists.');
    assert(firstSet.isCompleted === false, 'First set is initially marked as not completed.');

    // Update set reps and weight
    useWorkoutStore.getState().updateSet(firstSet.id, { reps: 8, weight: 22.5 });
    wState2 = useWorkoutStore.getState();
    let updatedSet = wState2.activeWorkoutLog.sets.find((s) => s.id === firstSet.id);
    assert(updatedSet.reps === 8 && updatedSet.weight === 22.5, 'Set reps and weight successfully updated.');

    // Toggle set completion
    useWorkoutStore.getState().toggleSetCompletion(firstSet.id);
    wState2 = useWorkoutStore.getState();
    updatedSet = wState2.activeWorkoutLog.sets.find((s) => s.id === firstSet.id);
    assert(updatedSet.isCompleted === true, 'Set is successfully completed.');

    // Cardio log check
    const recoveryDay = wState2.plans[0].days.find((d) => d.name === 'Recovery Day');
    assert(recoveryDay !== undefined, 'Recovery Day is found.');

    useWorkoutStore.getState().startWorkout(recoveryDay, 'default-user');
    wState2 = useWorkoutStore.getState();
    assert(wState2.activeWorkoutLog.name === 'Recovery Day', 'Active workout is Recovery Day.');
    assert(wState2.activeWorkoutLog.cardioLogs.length > 0, 'Cardio log is pre-populated for recovery day.');

    const firstCardio = wState2.activeWorkoutLog.cardioLogs[0];
    useWorkoutStore.getState().updateCardioLog(firstCardio.id, { durationSeconds: 1500, intensity: 'high' });
    wState2 = useWorkoutStore.getState();
    const updatedCardio = wState2.activeWorkoutLog.cardioLogs.find((c) => c.id === firstCardio.id);
    assert(updatedCardio.durationSeconds === 1500 && updatedCardio.intensity === 'high', 'Cardio log duration and intensity updated successfully.');

    // ----------------------------------------------------
    // FLOW 3: Progressive Overload Calculations
    // ----------------------------------------------------
    section('Flow 3: Progressive Overload Calculations');

    // Case A: Skipped sets or sets completed below max reps do NOT increment the suggested weight.
    // Testing skipped set
    await resetAll();
    useAuthStore.getState().continueAsGuest();
    await waitForHydration();

    let wState3 = useWorkoutStore.getState();
    let pushADay3 = wState3.plans[0].days.find((d) => d.name === 'Push A');
    useWorkoutStore.getState().startWorkout(pushADay3, 'default-user');
    wState3 = useWorkoutStore.getState();

    let benchSets = wState3.activeWorkoutLog.sets.filter((s) => s.exerciseName === 'Barbell Bench Press');
    assert(benchSets.length === 4, 'Barbell Bench Press has 4 target sets.');

    // Complete 3 of the 4 sets with max reps (8 reps). Leave 4th set incomplete.
    for (let i = 0; i < 3; i++) {
      useWorkoutStore.getState().updateSet(benchSets[i].id, { reps: 8, weight: 20.0, isCompleted: true });
    }
    useWorkoutStore.getState().updateSet(benchSets[3].id, { reps: 8, weight: 20.0, isCompleted: false });

    await useWorkoutStore.getState().completeWorkout();
    let suggested = useWorkoutStore.getState().getSuggestedWeight('Barbell Bench Press', 'Chest');
    assert(suggested === 20.0, `Case A (Skipped Set): Bench press weight remains ${suggested}kg (expected 20.0kg).`);

    // Testing below max reps
    await resetAll();
    useAuthStore.getState().continueAsGuest();
    await waitForHydration();

    wState3 = useWorkoutStore.getState();
    pushADay3 = wState3.plans[0].days.find((d) => d.name === 'Push A');
    useWorkoutStore.getState().startWorkout(pushADay3, 'default-user');
    wState3 = useWorkoutStore.getState();
    benchSets = wState3.activeWorkoutLog.sets.filter((s) => s.exerciseName === 'Barbell Bench Press');

    // Complete all sets, but one below max reps (7 reps instead of 8)
    for (let i = 0; i < 3; i++) {
      useWorkoutStore.getState().updateSet(benchSets[i].id, { reps: 8, weight: 20.0, isCompleted: true });
    }
    useWorkoutStore.getState().updateSet(benchSets[3].id, { reps: 7, weight: 20.0, isCompleted: true });

    await useWorkoutStore.getState().completeWorkout();
    suggested = useWorkoutStore.getState().getSuggestedWeight('Barbell Bench Press', 'Chest');
    assert(suggested === 20.0, `Case A (Below Max Reps): Bench press weight remains ${suggested}kg (expected 20.0kg).`);

    // Case B (Upper Body): Hitting max reps on all sets for an upper body day increases weight by +2.5kg.
    await resetAll();
    useAuthStore.getState().continueAsGuest();
    await waitForHydration();

    wState3 = useWorkoutStore.getState();
    pushADay3 = wState3.plans[0].days.find((d) => d.name === 'Push A');
    useWorkoutStore.getState().startWorkout(pushADay3, 'default-user');
    wState3 = useWorkoutStore.getState();
    benchSets = wState3.activeWorkoutLog.sets.filter((s) => s.exerciseName === 'Barbell Bench Press');

    // Complete all 4 sets with 8 reps at 20kg
    for (let i = 0; i < 4; i++) {
      useWorkoutStore.getState().updateSet(benchSets[i].id, { reps: 8, weight: 20.0, isCompleted: true });
    }

    await useWorkoutStore.getState().completeWorkout();
    suggested = useWorkoutStore.getState().getSuggestedWeight('Barbell Bench Press', 'Chest');
    assert(suggested === 22.5, `Case B (Upper Body): Bench press weight increased to ${suggested}kg (expected 22.5kg, +2.5kg increase).`);

    // Case C (Lower Body & Core): Hitting max reps on all sets for a lower body day increases weight by +5.0kg.
    await resetAll();
    useAuthStore.getState().continueAsGuest();
    await waitForHydration();

    wState3 = useWorkoutStore.getState();
    const legsDay3 = wState3.plans[0].days.find((d) => d.name === 'Legs + Core A');
    useWorkoutStore.getState().startWorkout(legsDay3, 'default-user');
    wState3 = useWorkoutStore.getState();

    let squatSets = wState3.activeWorkoutLog.sets.filter((s) => s.exerciseName === 'Barbell Back Squat');
    assert(squatSets.length === 4, 'Barbell Back Squat has 4 target sets.');

    // Complete all 4 sets with 8 reps at 40kg (default squat suggested weight)
    for (let i = 0; i < 4; i++) {
      useWorkoutStore.getState().updateSet(squatSets[i].id, { reps: 8, weight: 40.0, isCompleted: true });
    }

    await useWorkoutStore.getState().completeWorkout();
    suggested = useWorkoutStore.getState().getSuggestedWeight('Barbell Back Squat', 'Legs & Core');
    assert(suggested === 45.0, `Case C (Lower Body & Core): Squat weight increased to ${suggested}kg (expected 45.0kg, +5.0kg increase).`);

    // ----------------------------------------------------
    // FLOW 4: PR Detection
    // ----------------------------------------------------
    section('Flow 4: PR Detection');
    await resetAll();
    useAuthStore.getState().continueAsGuest();
    await waitForHydration();

    let wState4 = useWorkoutStore.getState();
    let pushADay4 = wState4.plans[0].days.find((d) => d.name === 'Push A');
    
    // First workout session: complete 1 set of Barbell Bench Press at 50kg for 8 reps (Volume: 400)
    useWorkoutStore.getState().startWorkout(pushADay4, 'default-user');
    wState4 = useWorkoutStore.getState();
    let benchSets4 = wState4.activeWorkoutLog.sets.filter((s) => s.exerciseName === 'Barbell Bench Press');
    
    useWorkoutStore.getState().updateSet(benchSets4[0].id, { reps: 8, weight: 50.0, isCompleted: true });
    await useWorkoutStore.getState().completeWorkout();
    wState4 = useWorkoutStore.getState();

    let prs = wState4.personalRecords.filter((p) => p.exerciseName === 'Barbell Bench Press');
    assert(prs.length === 3, `First session completed. Created ${prs.length} personal records (expected 3: weight, reps, volume).`);

    const wPR1 = prs.find((p) => p.prType === 'weight');
    const rPR1 = prs.find((p) => p.prType === 'reps');
    const vPR1 = prs.find((p) => p.prType === 'volume');

    assert(wPR1 && wPR1.value === 50.0, 'Weight PR correctly recorded as 50.0kg.');
    assert(rPR1 && rPR1.value === 8, 'Reps PR correctly recorded as 8 reps.');
    assert(vPR1 && vPR1.value === 400.0, 'Volume PR correctly recorded as 400.0 (50kg * 8 reps).');

    // Second workout session:
    // Set 1: 60kg for 6 reps. (Weight: 60 > 50 -> Weight PR. Reps: 6 < 8 -> no PR. Volume: 360 < 400 -> no PR)
    // Set 2: 40kg for 12 reps. (Weight: 40 < 50 -> no PR. Reps: 12 > 8 -> Reps PR. Volume: 480 > 400 -> Volume PR)
    useWorkoutStore.getState().startWorkout(pushADay4, 'default-user');
    wState4 = useWorkoutStore.getState();
    benchSets4 = wState4.activeWorkoutLog.sets.filter((s) => s.exerciseName === 'Barbell Bench Press');

    useWorkoutStore.getState().updateSet(benchSets4[0].id, { reps: 6, weight: 60.0, isCompleted: true });
    useWorkoutStore.getState().updateSet(benchSets4[1].id, { reps: 12, weight: 40.0, isCompleted: true });

    await useWorkoutStore.getState().completeWorkout();
    wState4 = useWorkoutStore.getState();

    prs = wState4.personalRecords.filter((p) => p.exerciseName === 'Barbell Bench Press');
    const latestW = prs.filter((p) => p.prType === 'weight').sort((a, b) => b.value - a.value)[0];
    const latestR = prs.filter((p) => p.prType === 'reps').sort((a, b) => b.value - a.value)[0];
    const latestV = prs.filter((p) => p.prType === 'volume').sort((a, b) => b.value - a.value)[0];

    assert(latestW && latestW.value === 60.0, `New session. New Weight PR is ${latestW.value}kg (expected 60.0kg).`);
    assert(latestR && latestR.value === 12, `New session. New Reps PR is ${latestR.value} reps (expected 12).`);
    assert(latestV && latestV.value === 480.0, `New session. New Volume PR is ${latestV.value} (expected 480.0).`);

    // ----------------------------------------------------
    // FLOW 5: Guest-to-User Data Migration
    // ----------------------------------------------------
    section('Flow 5: Guest-to-User Data Migration');
    await resetAll();

    // 1. Initialize guest user
    useAuthStore.getState().continueAsGuest();
    await waitForHydration();

    // 2. Log workout under guest mode
    let wState5 = useWorkoutStore.getState();
    let pushADay5 = wState5.plans[0].days.find((d) => d.name === 'Push A');
    useWorkoutStore.getState().startWorkout(pushADay5, 'default-user');
    wState5 = useWorkoutStore.getState();
    let benchSets5 = wState5.activeWorkoutLog.sets.filter((s) => s.exerciseName === 'Barbell Bench Press');
    useWorkoutStore.getState().updateSet(benchSets5[0].id, { reps: 8, weight: 60.0, isCompleted: true });
    await useWorkoutStore.getState().completeWorkout();

    // 3. Log body measurement under guest mode
    useMeasurementStore.getState().addMeasurement({
      userId: 'default-user',
      weight: 80.0,
      bodyFatPercentage: 14.5,
      measuredAt: new Date().toISOString(),
    });

    // Go offline so items accumulate in the queue without uploading
    mockNetInfo.setConnected(false);
    useSyncStore.getState().clearQueue();

    // 4. Perform sign-in operation to authenticated UUID
    const targetUserId = 'new-authenticated-user-uuid';
    await useAuthStore.getState().signIn('user@example.com', 'password');
    await waitForHydration();

    // 5. Verify local data is updated to target user UUID
    wState5 = useWorkoutStore.getState();
    const mState5 = useMeasurementStore.getState();
    const sState5 = useSettingsStore.getState();

    assert(sState5.settings.userId === targetUserId, `Settings userId migrated to ${targetUserId}.`);
    
    const plansCorrect = wState5.plans.every((p) => p.userId === targetUserId);
    assert(plansCorrect, `All plans in state have been migrated to userId: ${targetUserId}.`);

    const logsCorrect = wState5.workoutLogs.every((l) => l.userId === targetUserId);
    assert(logsCorrect, `All workout logs in state have been migrated to userId: ${targetUserId}.`);

    const prsCorrect = wState5.personalRecords.every((pr) => pr.userId === targetUserId);
    assert(prsCorrect, `All personal records in state have been migrated to userId: ${targetUserId}.`);

    const measCorrect = mState5.measurements.every((m) => m.userId === targetUserId);
    assert(measCorrect, `All body measurements in state have been migrated to userId: ${targetUserId}.`);

    // 6. Verify items are successfully queued in SyncQueue
    const syncQueue = useSyncStore.getState().queue;
    assert(syncQueue.length > 0, `Sync Queue successfully collected ${syncQueue.length} migrated items.`);

    const queueCorrect = syncQueue.every((item) => {
      const uid = item.payload.userId || item.payload.user_id;
      return uid === targetUserId;
    });
    assert(queueCorrect, 'All items in the sync queue contain the migrated userId: ' + targetUserId);

    const queuedTables = syncQueue.map((q) => q.table);
    assert(queuedTables.includes('workout_plans'), 'workout_plans table is queued.');
    assert(queuedTables.includes('workout_days'), 'workout_days table is queued.');
    assert(queuedTables.includes('exercises'), 'exercises table is queued.');
    assert(queuedTables.includes('workout_logs'), 'workout_logs table is queued.');
    assert(queuedTables.includes('exercise_sets'), 'exercise_sets table is queued.');
    assert(queuedTables.includes('personal_records'), 'personal_records table is queued.');
    assert(queuedTables.includes('body_measurements'), 'body_measurements table is queued.');

    // 7. Reconnect network and verify background sync executes and completes
    currentSession = { user: { id: targetUserId }, token: 'mock-session-token' };
    mockNetInfo.setConnected(true);

    // Wait for the background sync to finish processing the queue
    await new Promise((resolve) => setTimeout(resolve, 100)); // allow async listener to start
    while (useSyncStore.getState().isSyncing) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    const queueSizeAfter = useSyncStore.getState().queue.length;
    assert(queueSizeAfter === 0, 'Sync queue is completely empty after background sync runs online.');
    
    assert(dbStore['workout_logs'].length > 0, 'Mock DB table "workout_logs" successfully received upserted records.');
    assert(dbStore['body_measurements'].length > 0, 'Mock DB table "body_measurements" successfully received upserted records.');
    
    const dbLogsCorrect = dbStore['workout_logs'].every((l) => l.user_id === targetUserId);
    assert(dbLogsCorrect, 'All records in mock DB workout_logs have correct user_id matching targetUserId.');

  } catch (error) {
    console.error(`${colors.red}Test suite execution halted due to unexpected error:${colors.reset}`, error);
    failCount++;
  }

  // --- FINAL SUMMARY ---
  console.log(`\n${colors.bold}${colors.yellow}====================================================`);
  console.log(`                     TEST SUMMARY`);
  console.log(`====================================================${colors.reset}`);
  console.log(`${colors.green}Total Passed:${colors.reset} ${passCount}`);
  console.log(`${colors.red}Total Failed:${colors.reset} ${failCount}`);
  
  if (failCount === 0) {
    console.log(`\n${colors.green}${colors.bold}ALL TESTS PASSED SUCCESSFULLY! 🎉${colors.reset}`);
  } else {
    console.log(`\n${colors.red}${colors.bold}TEST SUITE FAILED WITH ${failCount} FAILURE(S). ❌${colors.reset}`);
  }
  console.log(`${colors.bold}${colors.yellow}====================================================${colors.reset}\n`);

  process.exit(failCount === 0 ? 0 : 1);
}

runTests();
