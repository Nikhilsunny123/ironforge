import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, Alert, Animated } from 'react-native';
import { useWorkoutStore } from '../store/workoutStore';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { RestTimer } from '../components/RestTimer';
import { SetRow } from '../components/SetRow';
import { useNavigation } from '@react-navigation/native';
import { isUpperBody } from '../utils/progressiveOverload';
import { generateUUID } from '../store/syncStore';

const CelebrationModalContent: React.FC<{
  summaryStats: { volume: number; setsCount: number; prs: string[] } | null;
}> = ({ summaryStats }) => {
  const trophyScale = useRef(new Animated.Value(0)).current;
  const prBadgeScale = useRef(new Animated.Value(0)).current;
  const listOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(trophyScale, {
        toValue: 1,
        tension: 40,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(200),
        Animated.spring(prBadgeScale, {
          toValue: 1,
          tension: 30,
          friction: 6,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(500),
        Animated.timing(listOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [trophyScale, prBadgeScale, listOpacity]);

  return (
    <View className="items-center py-2">
      {/* Animated Trophy badge */}
      <Animated.View style={{ transform: [{ scale: trophyScale }] }}>
        <Text className="text-5xl mb-4">🏆</Text>
      </Animated.View>
      <Text className="text-dark-text font-black text-xl text-center mb-1">Great Workout!</Text>
      <Text className="text-dark-muted text-xs text-center mb-6">
        Your metrics have been successfully logged, and progressive overload has been recalculated.
      </Text>

      {/* Stats Box */}
      <View className="w-full bg-zinc-950 border border-dark-border rounded-2xl p-4 gap-3 mb-4">
        <View className="flex-row justify-between items-center border-b border-dark-border/40 pb-2">
          <Text className="text-dark-muted text-xs font-semibold uppercase">Total Sets Logged</Text>
          <Text className="text-brand font-black text-sm">{summaryStats?.setsCount} Sets</Text>
        </View>
        <View className="flex-row justify-between items-center">
          <Text className="text-dark-muted text-xs font-semibold uppercase">Estimated Session Volume</Text>
          <Text className="text-brand font-black text-sm">{summaryStats?.volume} kg</Text>
        </View>
      </View>

      {/* PR Achievements list with spring bounce-in badge and fade-in list */}
      {summaryStats?.prs && summaryStats.prs.length > 0 && (
        <Animated.View 
          style={{ transform: [{ scale: prBadgeScale }] }} 
          className="w-full bg-orange-950/20 border border-brand/30 rounded-2xl p-4"
        >
          <Text className="text-brand font-black text-xs uppercase tracking-widest mb-2">🔥 NEW PERSONAL RECORDS!</Text>
          <Animated.View style={{ opacity: listOpacity }} className="gap-1.5">
            {summaryStats.prs.map((pr, idx) => (
              <Text key={idx} className="text-dark-text text-xs font-semibold">
                ⭐ {pr}
              </Text>
            ))}
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
};

export const WorkoutSessionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  
  const activeWorkoutLog = useWorkoutStore((state) => state.activeWorkoutLog);
  const workoutLogs = useWorkoutStore((state) => state.workoutLogs);
  const personalRecords = useWorkoutStore((state) => state.personalRecords);
  const plans = useWorkoutStore((state) => state.plans);
  
  const updateSet = useWorkoutStore((state) => state.updateSet);
  const addSet = useWorkoutStore((state) => state.addSet);
  const removeSet = useWorkoutStore((state) => state.removeSet);
  const toggleSetCompletion = useWorkoutStore((state) => state.toggleSetCompletion);
  const updateCardioLog = useWorkoutStore((state) => state.updateCardioLog);
  const completeWorkout = useWorkoutStore((state) => state.completeWorkout);
  const cancelWorkout = useWorkoutStore((state) => state.cancelWorkout);

  const [notes, setNotes] = useState<string>('');
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [showAddExerciseModal, setShowAddExerciseModal] = useState<boolean>(false);
  
  // Custom exercise modal state
  const [customExName, setCustomExName] = useState<string>('');
  const [customExMuscle, setCustomExMuscle] = useState<string>('Chest');
  const [customExSets, setCustomExSets] = useState<string>('3');
  const [customExReps, setCustomExReps] = useState<string>('10');

  // Workout Summary / PR Celebration modal state
  const [showCelebrationModal, setShowCelebrationModal] = useState<boolean>(false);
  const [summaryStats, setSummaryStats] = useState<{
    volume: number;
    setsCount: number;
    prs: string[];
  } | null>(null);

  // Return empty state if no active workout
  if (!activeWorkoutLog) {
    return (
      <View className="flex-1 bg-dark-bg items-center justify-center px-6">
        <Text className="text-4xl mb-3">🏋️</Text>
        <Text className="text-dark-text font-black text-lg text-center mb-1">No Active Session</Text>
        <Text className="text-dark-muted text-xs text-center mb-6 max-w-[280px]">
          Start a routine from the Workouts tab to begin tracking your training.
        </Text>
        <Button
          title="Go to Workouts"
          onPress={() => navigation.navigate('Workouts')}
          size="md"
        />
      </View>
    );
  }

  // 1. Group sets by exercise
  const exerciseGroups: Record<
    string,
    {
      exerciseId: string;
      exerciseName: string;
      targetMuscleGroup?: string;
      maxReps: number;
      minReps: number;
      targetSets: number;
      sets: typeof activeWorkoutLog.sets;
    }
  > = {};

  // Find exercise details in active plan for suggestion context
  const activePlan = plans.find((p) => p.isActive);

  activeWorkoutLog.sets?.forEach((set) => {
    const key = set.exerciseId || set.exerciseName;
    if (!exerciseGroups[key]) {
      // Find targets from active plan
      let maxReps = 12;
      let minReps = 8;
      let targetSets = 3;
      let targetMuscleGroup = 'Other';

      if (activePlan?.days) {
        for (const day of activePlan.days) {
          const matchingEx = day.exercises?.find((e) => e.name === set.exerciseName || e.id === set.exerciseId);
          if (matchingEx) {
            maxReps = matchingEx.maxReps;
            minReps = matchingEx.minReps;
            targetSets = matchingEx.targetSets;
            targetMuscleGroup = matchingEx.targetMuscleGroup || 'Other';
            break;
          }
        }
      }

      exerciseGroups[key] = {
        exerciseId: set.exerciseId || '',
        exerciseName: set.exerciseName,
        targetMuscleGroup,
        maxReps,
        minReps,
        targetSets,
        sets: [],
      };
    }
    exerciseGroups[key].sets?.push(set);
  });

  const getPreviousPerformance = (exerciseName: string) => {
    for (let i = workoutLogs.length - 1; i >= 0; i--) {
      const log = workoutLogs[i];
      if (log.id === activeWorkoutLog.id) continue;
      const completed = log.sets?.filter((s) => s.exerciseName === exerciseName && s.isCompleted) || [];
      if (completed.length > 0) {
        // Sort sets by setOrder
        const sorted = [...completed].sort((a, b) => a.setOrder - b.setOrder);
        return sorted.map((s) => `${s.weight}kg × ${s.reps}`).join(', ');
      }
    }
    return 'No previous sets';
  };

  const getOverloadTip = (exerciseName: string, targetMuscleGroup?: string, maxReps?: number) => {
    const isUpper = isUpperBody(targetMuscleGroup);
    const increment = isUpper ? 2.5 : 5.0;
    return `Double progression: hit ${maxReps || 10} reps on all sets to increase weight by +${increment}kg next session.`;
  };

  const handleFinishWorkout = async () => {
    const completedSets = activeWorkoutLog.sets?.filter((s) => s.isCompleted) || [];
    if (completedSets.length === 0 && (activeWorkoutLog.cardioLogs?.length === 0)) {
      Alert.alert('Empty Workout', 'Please log at least one completed set or cardio exercise to save this session.');
      return;
    }

    try {
      const beforePRCount = personalRecords.length;
      
      // Calculate statistics before completing (to display in modal)
      const sessionVolume = completedSets.reduce((sum, s) => sum + (s.weight || 0) * (s.reps || 0), 0);
      const sessionSetsCount = completedSets.length;

      // Complete
      await completeWorkout(notes);

      // Fetch freshly updated PRs from the store
      const afterPRs = useWorkoutStore.getState().personalRecords;
      const newlyAchievedPRs = afterPRs.slice(beforePRCount);
      const prDetails = newlyAchievedPRs.map(pr => `${pr.exerciseName} (${pr.prType}: ${pr.value})`);

      setSummaryStats({
        volume: sessionVolume,
        setsCount: sessionSetsCount,
        prs: prDetails,
      });

      setShowCelebrationModal(true);
    } catch (err: any) {
      Alert.alert('Error completing workout', err.message || 'Something went wrong.');
    }
  };

  const handleCancelWorkout = () => {
    cancelWorkout();
    setShowCancelModal(false);
    navigation.goBack();
  };

  // Add custom exercise from active workout screen
  const handleAddCustomExercise = () => {
    const setsVal = parseInt(customExSets) || 3;
    const repsVal = parseInt(customExReps) || 10;
    const newExId = generateUUID();

    if (!customExName.trim()) {
      Alert.alert('Validation Error', 'Please enter a name for the exercise.');
      return;
    }

    // Add sets directly to active workout log in store
    const userId = activeWorkoutLog.userId;
    const currentWeight = 15; // default helper starting weight

    // We can simulate adding sets inside store
    // Let's create the sets manually in store. Since we have addSet action, we can call it.
    // However, addSet uses the getSuggestedWeight internally.
    // To support completely custom exercise, we can add sets one by one
    for (let i = 0; i < setsVal; i++) {
      // Create new set
      const newSet = {
        id: generateUUID(),
        userId,
        workoutLogId: activeWorkoutLog.id,
        exerciseId: newExId,
        exerciseName: customExName,
        setOrder: i,
        weight: currentWeight,
        reps: repsVal,
        isCompleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      // Let's update workout store using update workoutLog sets
      useWorkoutStore.setState((state) => {
        if (!state.activeWorkoutLog) return state;
        return {
          activeWorkoutLog: {
            ...state.activeWorkoutLog,
            sets: [...(state.activeWorkoutLog.sets || []), newSet],
          },
        };
      });
    }

    setShowAddExerciseModal(false);
    setCustomExName('');
  };

  // Remove/Skip an exercise entirely from this session
  const handleSkipExercise = (exerciseId: string, exerciseName: string) => {
    Alert.alert(
      'Skip Exercise',
      `Are you sure you want to skip/remove ${exerciseName} from this active session?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Skip', 
          style: 'destructive',
          onPress: () => {
            // Filter out sets matching the skipped exercise
            useWorkoutStore.setState((state) => {
              if (!state.activeWorkoutLog) return state;
              const remainingSets = state.activeWorkoutLog.sets?.filter(
                (s) => (s.exerciseId !== exerciseId && s.exerciseName !== exerciseName)
              ) || [];
              return {
                activeWorkoutLog: {
                  ...state.activeWorkoutLog,
                  sets: remainingSets,
                },
              };
            });
          }
        }
      ]
    );
  };

  return (
    <View className="flex-1 bg-dark-bg">
      <ScrollView className="flex-1 px-4 py-6">
        {/* Header Title */}
        <View className="flex-row justify-between items-center mb-5">
          <View>
            <Text className="text-brand font-black text-xs uppercase tracking-widest">Workout Session</Text>
            <Text className="text-dark-text text-2xl font-black tracking-tight">{activeWorkoutLog.name}</Text>
          </View>
          <View className="flex-row gap-2">
            <Button
              title="Cancel"
              variant="outline"
              size="sm"
              onPress={() => setShowCancelModal(true)}
            />
            <Button
              title="Finish"
              variant="primary"
              size="sm"
              onPress={handleFinishWorkout}
            />
          </View>
        </View>

        {/* Rest Timer Banner */}
        <RestTimer />

        {/* Exercises List */}
        {Object.values(exerciseGroups).length === 0 && activeWorkoutLog.cardioLogs?.length === 0 ? (
          <Card className="items-center py-8 mb-5">
            <Text className="text-dark-muted text-sm font-semibold mb-1">Your workout session is empty.</Text>
            <Text className="text-zinc-500 text-xs text-center mb-4">Add a custom exercise to begin.</Text>
            <Button title="Add Exercise" onPress={() => setShowAddExerciseModal(true)} size="sm" />
          </Card>
        ) : (
          Object.values(exerciseGroups).map((group) => (
            <Card
              key={group.exerciseId || group.exerciseName}
              title={group.exerciseName}
              subtitle={group.targetMuscleGroup ? `Muscle focus: ${group.targetMuscleGroup}` : undefined}
              headerRight={
                <Pressable
                  onPress={() => handleSkipExercise(group.exerciseId, group.exerciseName)}
                  className="px-2 py-1 bg-zinc-800 rounded-lg active:bg-zinc-700"
                >
                  <Text className="text-red-400 font-bold text-[10px] uppercase">Skip</Text>
                </Pressable>
              }
              className="mb-5 border-t border-t-zinc-800"
            >
              {/* Overload Tip Alert */}
              <View className="bg-brand/5 border border-brand/20 p-2.5 rounded-xl mb-3">
                <Text className="text-[10px] text-brand/90 font-bold leading-normal uppercase">Overload Tip</Text>
                <Text className="text-zinc-400 text-[10px] mt-0.5 leading-relaxed">
                  {getOverloadTip(group.exerciseName, group.targetMuscleGroup, group.maxReps)}
                </Text>
              </View>

              {/* Set Row Header labels */}
              <View className="flex-row justify-between py-1 border-b border-dark-border/30 px-1 mb-1">
                <Text className="w-8 text-[10px] font-bold text-dark-muted text-center uppercase">Set</Text>
                <Text className="flex-1 px-2 text-[10px] font-bold text-dark-muted uppercase">History / Target</Text>
                <Text className="w-20 text-[10px] font-bold text-dark-muted text-center uppercase">Weight</Text>
                <Text className="w-18 text-[10px] font-bold text-dark-muted text-center uppercase">Reps</Text>
                <Text className="w-9 text-[10px] font-bold text-dark-muted text-center uppercase">Done</Text>
              </View>

              {/* Set Rows */}
              {group.sets
                ?.sort((a, b) => a.setOrder - b.setOrder)
                .map((set, idx) => (
                  <SetRow
                    key={set.id}
                    set={set}
                    index={idx}
                    previousPerformance={getPreviousPerformance(group.exerciseName)}
                    targetRepsRange={`${group.minReps}-${group.maxReps}`}
                    onUpdate={(updates) => updateSet(set.id, updates)}
                    onToggleComplete={() => toggleSetCompletion(set.id)}
                    onRemove={() => removeSet(set.id)}
                  />
                ))}

              {/* Add Set Row Trigger */}
              <Pressable
                onPress={() => addSet(group.exerciseId, group.exerciseName, activeWorkoutLog.userId)}
                className="mt-3 flex-row justify-center items-center py-2 border border-dashed border-dark-border rounded-xl active:bg-zinc-900/40"
              >
                <Text className="text-brand font-bold text-xs">+ Add Set</Text>
              </Pressable>
            </Card>
          ))
        )}

        {/* Cardio Logs (If any, e.g. Treadmill Walk) */}
        {activeWorkoutLog.cardioLogs?.map((cardio) => (
          <Card key={cardio.id} title={cardio.name} subtitle="Cardio Log" className="mb-5 border-t border-t-zinc-800">
            <View className="gap-3.5 mt-2">
              <View className="flex-row justify-between items-center bg-zinc-900 border border-dark-border p-3 rounded-xl">
                <View>
                  <Text className="text-dark-muted text-[10px] uppercase font-bold">Duration</Text>
                  <Text className="text-dark-text font-black text-sm mt-0.5">
                    {Math.round(cardio.durationSeconds / 60)} minutes
                  </Text>
                </View>
                <View className="flex-row gap-1">
                  {[-5, 5].map((amt) => (
                    <Pressable
                      key={amt}
                      onPress={() =>
                        updateCardioLog(cardio.id, {
                          durationSeconds: Math.max(60, cardio.durationSeconds + amt * 60),
                        })
                      }
                      className="bg-zinc-800 px-3 py-1.5 rounded-lg active:bg-zinc-700"
                    >
                      <Text className="text-dark-text font-bold text-xs">{amt > 0 ? `+${amt}` : amt}m</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Intensity Picker */}
              <View className="flex-row items-center justify-between">
                <Text className="text-dark-text font-bold text-xs">Intensity</Text>
                <View className="flex-row gap-1">
                  {(['low', 'medium', 'high'] as const).map((level) => (
                    <Pressable
                      key={level}
                      onPress={() => updateCardioLog(cardio.id, { intensity: level })}
                      className={`px-3 py-1.5 rounded-lg border uppercase text-[10px] font-bold ${
                        cardio.intensity === level
                          ? 'bg-brand/20 border-brand/60 text-brand'
                          : 'bg-zinc-900 border-dark-border text-dark-muted active:bg-zinc-800'
                      }`}
                    >
                      <Text
                        className={`text-[10px] font-bold uppercase ${
                          cardio.intensity === level ? 'text-brand' : 'text-dark-muted'
                        }`}
                      >
                        {level}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          </Card>
        ))}

        {/* Add custom exercise trigger button */}
        {Object.values(exerciseGroups).length > 0 && (
          <Button
            title="Add Custom Exercise"
            variant="secondary"
            onPress={() => setShowAddExerciseModal(true)}
            style={{ marginBottom: 20 }}
          />
        )}

        {/* Notes Text Input */}
        <Card title="Workout Notes" className="mb-8">
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Log details about energy, gym crowd, or recovery..."
            placeholderTextColor="#71717a"
            multiline
            numberOfLines={3}
            className="bg-zinc-900 border border-dark-border text-dark-text rounded-xl p-3.5 text-sm h-20 text-left align-top"
          />
        </Card>

        {/* Spacer */}
        <View className="h-16" />
      </ScrollView>

      {/* Cancel Confirmation Modal */}
      <Modal
        visible={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Discard Workout Session"
        footer={
          <React.Fragment>
            <Button
              title="Resume"
              variant="ghost"
              onPress={() => setShowCancelModal(false)}
              size="sm"
            />
            <Button
              title="Discard"
              variant="danger"
              onPress={handleCancelWorkout}
              size="sm"
            />
          </React.Fragment>
        }
      >
        <Text className="text-dark-text text-sm mb-1 leading-relaxed">
          Are you sure you want to discard this active session?
        </Text>
        <Text className="text-red-400 text-xs font-semibold">
          This will delete all completed sets and logs in this session permanently.
        </Text>
      </Modal>

      {/* Custom Exercise Picker Modal */}
      <Modal
        visible={showAddExerciseModal}
        onClose={() => setShowAddExerciseModal(false)}
        title="Add Custom Exercise"
        footer={
          <React.Fragment>
            <Button
              title="Cancel"
              variant="ghost"
              onPress={() => setShowAddExerciseModal(false)}
              size="sm"
            />
            <Button
              title="Add"
              variant="primary"
              onPress={handleAddCustomExercise}
              size="sm"
            />
          </React.Fragment>
        }
      >
        <View className="gap-4">
          <View>
            <Text className="text-dark-muted text-xs font-bold uppercase mb-1">Exercise Name</Text>
            <TextInput
              value={customExName}
              onChangeText={setCustomExName}
              placeholder="e.g. Incline Cable Fly"
              placeholderTextColor="#71717a"
              className="bg-zinc-900 border border-dark-border text-dark-text rounded-xl p-3 text-sm"
            />
          </View>

          <View>
            <Text className="text-dark-muted text-xs font-bold uppercase mb-1">Muscle Group</Text>
            <View className="flex-row flex-wrap gap-1.5">
              {['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Legs & Core', 'Abs'].map((m) => (
                <Pressable
                  key={m}
                  onPress={() => setCustomExMuscle(m)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                    customExMuscle === m
                      ? 'bg-brand/20 border-brand/60 text-brand'
                      : 'bg-zinc-900 border-dark-border text-dark-muted active:bg-zinc-800'
                  }`}
                >
                  <Text className={`text-xs font-medium ${customExMuscle === m ? 'text-brand' : 'text-dark-muted'}`}>
                    {m}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View className="flex-row justify-between gap-3">
            <View className="flex-1">
              <Text className="text-dark-muted text-xs font-bold uppercase mb-1">Sets</Text>
              <TextInput
                value={customExSets}
                onChangeText={setCustomExSets}
                keyboardType="number-pad"
                className="bg-zinc-900 border border-dark-border text-dark-text rounded-xl p-3 text-center text-sm font-semibold"
              />
            </View>
            <View className="flex-1">
              <Text className="text-dark-muted text-xs font-bold uppercase mb-1">Reps</Text>
              <TextInput
                value={customExReps}
                onChangeText={setCustomExReps}
                keyboardType="number-pad"
                className="bg-zinc-900 border border-dark-border text-dark-text rounded-xl p-3 text-center text-sm font-semibold"
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Completion Celebration Summary Modal */}
      <Modal
        visible={showCelebrationModal}
        onClose={() => {
          setShowCelebrationModal(false);
          navigation.navigate('Dashboard');
        }}
        title="🎉 WORKOUT FORGED!"
        footer={
          <Button
            title="Continue to Dashboard"
            variant="primary"
            onPress={() => {
              setShowCelebrationModal(false);
              navigation.navigate('Dashboard');
            }}
            size="sm"
          />
        }
      >
        <CelebrationModalContent summaryStats={summaryStats} />
      </Modal>
    </View>
  );
};
