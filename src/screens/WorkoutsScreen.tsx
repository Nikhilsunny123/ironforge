import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { useWorkoutStore, WorkoutDay } from '../store/workoutStore';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { useNavigation } from '@react-navigation/native';
import { generateUUID, useSyncStore } from '../store/syncStore';
import { syncService } from '../services/syncService';
import { Ionicons } from '@expo/vector-icons';

interface FormExercise {
  name: string;
  category: 'strength' | 'cardio';
  targetSets: number;
  minReps: number;
  maxReps: number;
  targetMuscleGroup: string;
  cardioDurationMinutes: number;
}

export const WorkoutsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  
  const plans = useWorkoutStore((state) => state.plans);
  const activeWorkoutLog = useWorkoutStore((state) => state.activeWorkoutLog);
  const initDefaultPlans = useWorkoutStore((state) => state.initDefaultPlans);
  const startWorkout = useWorkoutStore((state) => state.startWorkout);
  
  // Store actions
  const addWorkoutDay = useWorkoutStore((state) => state.addWorkoutDay);
  const deleteWorkoutDay = useWorkoutStore((state) => state.deleteWorkoutDay);
  const addExerciseToDay = useWorkoutStore((state) => state.addExerciseToDay);
  const deleteExerciseFromDay = useWorkoutStore((state) => state.deleteExerciseFromDay);

  const userId = 'default-user';

  // Initialize plans if empty
  useEffect(() => {
    initDefaultPlans(userId);
  }, []);

  const activePlan = plans.find((p) => p.isActive) || plans[0];

  // State to manage confirmation modal for overriding active session
  const [selectedDayToStart, setSelectedDayToStart] = useState<WorkoutDay | null>(null);
  const [showOverrideModal, setShowOverrideModal] = useState<boolean>(false);
  const [isEmptyWorkoutSelected, setIsEmptyWorkoutSelected] = useState<boolean>(false);

  // Custom Routine Creation State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [routineName, setRoutineName] = useState<string>('');
  const [routineFocus, setRoutineFocus] = useState<string>('');
  const [newExercises, setNewExercises] = useState<FormExercise[]>([
    {
      name: '',
      category: 'strength',
      targetSets: 3,
      minReps: 8,
      maxReps: 12,
      targetMuscleGroup: '',
      cardioDurationMinutes: 30,
    },
  ]);

  // Custom Routine Editing State
  const [editingRoutine, setEditingRoutine] = useState<WorkoutDay | null>(null);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editRoutineName, setEditRoutineName] = useState<string>('');
  const [editRoutineFocus, setEditRoutineFocus] = useState<string>('');

  // Add Exercise on the fly inside edit modal
  const [addExName, setAddExName] = useState<string>('');
  const [addExCategory, setAddExCategory] = useState<'strength' | 'cardio'>('strength');
  const [addExSets, setAddExSets] = useState<string>('3');
  const [addExMinReps, setAddExMinReps] = useState<string>('8');
  const [addExMaxReps, setAddExMaxReps] = useState<string>('12');
  const [addExMuscle, setAddExMuscle] = useState<string>('');
  const [addExCardioDuration, setAddExCardioDuration] = useState<string>('30');

  const handleStartWorkoutPress = (day: WorkoutDay) => {
    if (activeWorkoutLog) {
      setSelectedDayToStart(day);
      setIsEmptyWorkoutSelected(false);
      setShowOverrideModal(true);
    } else {
      startWorkout(day, userId);
      navigation.navigate('WorkoutSession');
    }
  };

  const handleStartEmptyWorkoutPress = () => {
    if (activeWorkoutLog) {
      setIsEmptyWorkoutSelected(true);
      setSelectedDayToStart(null);
      setShowOverrideModal(true);
    } else {
      triggerEmptyWorkout();
    }
  };

  const triggerEmptyWorkout = () => {
    const emptyDay: WorkoutDay = {
      id: generateUUID(),
      userId,
      planId: activePlan?.id || generateUUID(),
      name: 'Custom Empty Workout',
      dayOrder: 99,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      exercises: [],
    };
    startWorkout(emptyDay, userId);
    navigation.navigate('WorkoutSession');
  };

  const confirmOverride = () => {
    setShowOverrideModal(false);
    if (isEmptyWorkoutSelected) {
      triggerEmptyWorkout();
    } else if (selectedDayToStart) {
      startWorkout(selectedDayToStart, userId);
      navigation.navigate('WorkoutSession');
    }
    setSelectedDayToStart(null);
    setIsEmptyWorkoutSelected(false);
  };

  // Create Routine Handlers
  const handleAddExerciseRow = () => {
    setNewExercises([
      ...newExercises,
      {
        name: '',
        category: 'strength',
        targetSets: 3,
        minReps: 8,
        maxReps: 12,
        targetMuscleGroup: '',
        cardioDurationMinutes: 30,
      },
    ]);
  };

  const handleRemoveExerciseRow = (index: number) => {
    setNewExercises(newExercises.filter((_, idx) => idx !== index));
  };

  const handleUpdateExerciseRow = (index: number, key: keyof FormExercise, value: any) => {
    const updated = [...newExercises];
    updated[index] = { ...updated[index], [key]: value } as FormExercise;
    setNewExercises(updated);
  };

  const handleCreateRoutine = () => {
    if (!routineName.trim()) {
      Alert.alert('Validation Error', 'Routine Name is required.');
      return;
    }
    const validExercises = newExercises.filter((e) => e.name.trim() !== '');
    if (validExercises.length === 0) {
      Alert.alert('Validation Error', 'Please include at least one exercise with a name.');
      return;
    }
    if (!activePlan) {
      Alert.alert('Error', 'No active program loaded.');
      return;
    }

    addWorkoutDay(activePlan.id, routineName, routineFocus, validExercises, userId);

    // Reset Creation State
    setRoutineName('');
    setRoutineFocus('');
    setNewExercises([
      {
        name: '',
        category: 'strength',
        targetSets: 3,
        minReps: 8,
        maxReps: 12,
        targetMuscleGroup: '',
        cardioDurationMinutes: 30,
      },
    ]);
    setShowCreateModal(false);
  };

  // Edit Routine Handlers
  const handleSaveRoutineDetails = () => {
    if (!editingRoutine) return;
    if (!editRoutineName.trim()) {
      Alert.alert('Validation Error', 'Routine Name is required.');
      return;
    }

    const now = new Date().toISOString();
    const updatedPlans = plans.map((p) => {
      if (p.id === editingRoutine.planId) {
        return {
          ...p,
          days: p.days?.map((d) => {
            if (d.id === editingRoutine.id) {
              const updatedExercises = d.exercises?.map((e) => ({
                ...e,
                notes: editRoutineFocus,
                updatedAt: now,
              })) || [];

              // Sync each exercise update to keep notes (focus) in sync
              const { addToQueue } = useSyncStore.getState();
              updatedExercises.forEach((exercise) => {
                addToQueue({
                  table: 'exercises',
                  action: 'UPDATE',
                  payload: exercise,
                });
              });

              return {
                ...d,
                name: editRoutineName,
                exercises: updatedExercises,
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

    useWorkoutStore.setState({ plans: updatedPlans });

    const updatedDay = updatedPlans
      .find((p) => p.id === editingRoutine.planId)
      ?.days?.find((d) => d.id === editingRoutine.id);

    if (updatedDay) {
      const { exercises: _, ...flatDay } = updatedDay;
      const { addToQueue } = useSyncStore.getState();
      addToQueue({
        table: 'workout_days',
        action: 'UPDATE',
        payload: flatDay,
      });
    }

    syncService.sync();
    Alert.alert('Success', 'Routine details updated successfully.');
  };

  const handleDeleteRoutinePress = () => {
    if (!editingRoutine) return;
    Alert.alert(
      'Delete Routine',
      `Are you sure you want to delete "${editingRoutine.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteWorkoutDay(editingRoutine.id);
            setShowEditModal(false);
            setEditingRoutine(null);
          },
        },
      ]
    );
  };

  const handleAddExerciseToRoutine = () => {
    if (!addExName.trim()) {
      Alert.alert('Validation Error', 'Exercise Name is required.');
      return;
    }
    if (!editingRoutine) return;

    const exerciseData = {
      name: addExName,
      category: addExCategory,
      targetSets: parseInt(addExSets) || 0,
      minReps: parseInt(addExMinReps) || 0,
      maxReps: parseInt(addExMaxReps) || 0,
      targetMuscleGroup: addExMuscle,
      cardioDurationMinutes: parseInt(addExCardioDuration) || 0,
      notes: editRoutineFocus,
    };

    addExerciseToDay(editingRoutine.id, exerciseData, userId);

    // Reset Inputs
    setAddExName('');
    setAddExCategory('strength');
    setAddExSets('3');
    setAddExMinReps('8');
    setAddExMaxReps('12');
    setAddExMuscle('');
    setAddExCardioDuration('30');
  };

  return (
    <ScrollView className="flex-1 bg-dark-bg px-4 py-6">
      {/* Header and Quick Actions */}
      <View className="flex-row justify-between items-center mb-6">
        <View className="flex-1 mr-2">
          <Text className="text-dark-text text-2xl font-black tracking-tight">WORKOUTS</Text>
          <Text className="text-dark-muted text-sm">Select a routine to begin</Text>
        </View>
        <View className="flex-row gap-2">
          <Button
            title="+ Add Routine"
            variant="primary"
            size="sm"
            onPress={() => setShowCreateModal(true)}
          />
          <Button
            title="Start Empty"
            variant="outline"
            size="sm"
            onPress={handleStartEmptyWorkoutPress}
          />
        </View>
      </View>

      {/* Active Workout Banner Overlay Notification */}
      {activeWorkoutLog && (
        <Pressable
          onPress={() => navigation.navigate('WorkoutSession')}
          className="bg-brand/10 border border-brand/40 px-4 py-3 rounded-2xl mb-5 flex-row justify-between items-center"
        >
          <View className="flex-1 mr-2">
            <Text className="text-brand font-bold text-xs uppercase tracking-widest">Active Workout Session</Text>
            <Text className="text-dark-text font-bold text-sm mt-0.5">{activeWorkoutLog.name} in progress</Text>
          </View>
          <Text className="text-brand font-bold text-xs uppercase">Resume →</Text>
        </Pressable>
      )}

      {/* Program details banner */}
      {activePlan ? (
        <View className="mb-6">
          <Text className="text-brand font-bold text-xs uppercase tracking-widest mb-1">Current Program</Text>
          <Text className="text-dark-text font-black text-xl leading-tight">{activePlan.name}</Text>
          <Text className="text-dark-muted text-xs mt-1.5 leading-relaxed">{activePlan.description}</Text>
        </View>
      ) : (
        <Card className="items-center py-6 mb-6">
          <Text className="text-dark-muted text-sm font-semibold mb-2">No program active</Text>
          <Button title="Load Default Split" onPress={() => initDefaultPlans(userId)} size="sm" />
        </Card>
      )}

      {/* 6-Day Split List */}
      <View className="gap-4">
        {activePlan?.days?.map((day) => {
          const exerciseCount = day.exercises?.length || 0;
          const isRecovery = day.name.toLowerCase().includes('recovery');

          return (
            <Card
              key={day.id}
              title={day.name}
              headerRight={
                <View className="flex-row items-center gap-2">
                  <Badge
                    label={isRecovery ? 'Recovery' : `${exerciseCount} Exercises`}
                    variant={isRecovery ? 'secondary' : 'primary'}
                  />
                  <Pressable
                    onPress={() => {
                      setEditingRoutine(day);
                      setEditRoutineName(day.name);
                      setEditRoutineFocus(day.exercises?.[0]?.notes || '');
                      setShowEditModal(true);
                    }}
                    className="p-1.5 rounded-xl bg-zinc-900 border border-dark-border active:bg-zinc-800"
                  >
                    <Ionicons name="settings-outline" size={16} color="#f4f4f5" />
                  </Pressable>
                </View>
              }
              className={`border border-dark-border/60 ${isRecovery ? 'opacity-80' : ''}`}
            >
              <Text className="text-zinc-400 text-xs mb-3 font-medium">
                {day.exercises?.[0]?.notes || 'Focus: Workout session routine.'}
              </Text>

              {/* Short Exercise Previews */}
              {exerciseCount > 0 && (
                <View className="bg-zinc-950/60 border border-dark-border/40 rounded-xl p-3 mb-4 gap-1.5">
                  {day.exercises?.slice(0, 3).map((ex) => (
                    <View key={ex.id} className="flex-row items-center justify-between">
                      <Text className="text-dark-text text-xs font-semibold flex-1 mr-2" numberOfLines={1}>
                        • {ex.name}
                      </Text>
                      <Text className="text-dark-muted text-[10px]">
                        {ex.category === 'strength'
                          ? `${ex.targetSets} sets × ${ex.minReps}-${ex.maxReps} reps`
                          : `${ex.cardioDurationMinutes} mins`}
                      </Text>
                    </View>
                  ))}
                  {exerciseCount > 3 && (
                    <Text className="text-dark-muted text-[10px] font-bold mt-1 text-right">
                      + {exerciseCount - 3} more exercises
                    </Text>
                  )}
                </View>
              )}

              {/* Start Workout Button */}
              <Button
                title={isRecovery ? 'Start Recovery' : 'Start Routine'}
                variant={isRecovery ? 'secondary' : 'primary'}
                onPress={() => handleStartWorkoutPress(day)}
                size="md"
              />
            </Card>
          );
        })}
      </View>

      {/* Add Custom Routine Modal */}
      <Modal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add Custom Routine"
        footer={
          <React.Fragment>
            <Button
              title="Cancel"
              variant="ghost"
              onPress={() => setShowCreateModal(false)}
              size="sm"
            />
            <Button
              title="Create"
              variant="primary"
              onPress={handleCreateRoutine}
              size="sm"
            />
          </React.Fragment>
        }
      >
        <View className="gap-4 pb-6">
          <View>
            <Text className="text-dark-muted text-[10px] font-bold uppercase mb-1">Routine Name *</Text>
            <TextInput
              value={routineName}
              onChangeText={setRoutineName}
              placeholder="e.g. Legs & Abs Blast"
              placeholderTextColor="#71717a"
              className="bg-zinc-900 border border-dark-border text-dark-text rounded-xl p-3 text-sm font-semibold"
            />
          </View>

          <View>
            <Text className="text-dark-muted text-[10px] font-bold uppercase mb-1">Focus / Notes</Text>
            <TextInput
              value={routineFocus}
              onChangeText={setRoutineFocus}
              placeholder="e.g. Focus on quad depth and core stability"
              placeholderTextColor="#71717a"
              className="bg-zinc-900 border border-dark-border text-dark-text rounded-xl p-3 text-sm font-semibold"
            />
          </View>

          <View className="h-[1px] bg-dark-border/40 my-2" />

          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-dark-text font-black text-sm tracking-tight">EXERCISES</Text>
            <Button
              title="+ Add Exercise"
              variant="outline"
              size="sm"
              onPress={handleAddExerciseRow}
            />
          </View>

          {newExercises.map((ex, index) => (
            <View
              key={index}
              className="border border-dark-border/60 bg-zinc-900/40 p-4 rounded-2xl gap-3"
            >
              <View className="flex-row justify-between items-center">
                <Text className="text-brand font-black text-xs">EXERCISE #{index + 1}</Text>
                {newExercises.length > 1 && (
                  <Pressable
                    onPress={() => handleRemoveExerciseRow(index)}
                    className="px-2 py-1 bg-red-950/20 border border-red-500/20 rounded-lg active:bg-red-950/40"
                  >
                    <Text className="text-red-400 text-[10px] font-bold">REMOVE</Text>
                  </Pressable>
                )}
              </View>

              <View>
                <Text className="text-dark-muted text-[10px] font-bold uppercase mb-1">Exercise Name *</Text>
                <TextInput
                  value={ex.name}
                  onChangeText={(val) => handleUpdateExerciseRow(index, 'name', val)}
                  placeholder="e.g. Bulgarian Split Squat"
                  placeholderTextColor="#71717a"
                  className="bg-zinc-900 border border-dark-border text-dark-text rounded-xl p-2.5 text-xs font-semibold"
                />
              </View>

              <View>
                <Text className="text-dark-muted text-[10px] font-bold uppercase mb-1">Category</Text>
                <View className="flex-row gap-2">
                  <Pressable
                    onPress={() => handleUpdateExerciseRow(index, 'category', 'strength')}
                    className={`flex-1 py-2 rounded-xl border ${
                      ex.category === 'strength' ? 'bg-brand/20 border-brand' : 'bg-zinc-900 border-dark-border'
                    }`}
                  >
                    <Text className={`text-center text-xs font-bold ${ex.category === 'strength' ? 'text-brand' : 'text-dark-muted'}`}>
                      Strength
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleUpdateExerciseRow(index, 'category', 'cardio')}
                    className={`flex-1 py-2 rounded-xl border ${
                      ex.category === 'cardio' ? 'bg-brand/20 border-brand' : 'bg-zinc-900 border-dark-border'
                    }`}
                  >
                    <Text className={`text-center text-xs font-bold ${ex.category === 'cardio' ? 'text-brand' : 'text-dark-muted'}`}>
                      Cardio
                    </Text>
                  </Pressable>
                </View>
              </View>

              {ex.category === 'strength' ? (
                <View className="gap-3">
                  <View className="flex-row gap-2">
                    <View className="flex-1">
                      <Text className="text-dark-muted text-[10px] font-bold uppercase mb-1">Sets</Text>
                      <TextInput
                        value={String(ex.targetSets)}
                        onChangeText={(val) => handleUpdateExerciseRow(index, 'targetSets', parseInt(val) || 0)}
                        keyboardType="number-pad"
                        placeholder="3"
                        placeholderTextColor="#71717a"
                        className="bg-zinc-900 border border-dark-border text-dark-text rounded-xl p-2.5 text-xs font-semibold"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-dark-muted text-[10px] font-bold uppercase mb-1">Min Reps</Text>
                      <TextInput
                        value={String(ex.minReps)}
                        onChangeText={(val) => handleUpdateExerciseRow(index, 'minReps', parseInt(val) || 0)}
                        keyboardType="number-pad"
                        placeholder="8"
                        placeholderTextColor="#71717a"
                        className="bg-zinc-900 border border-dark-border text-dark-text rounded-xl p-2.5 text-xs font-semibold"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-dark-muted text-[10px] font-bold uppercase mb-1">Max Reps</Text>
                      <TextInput
                        value={String(ex.maxReps)}
                        onChangeText={(val) => handleUpdateExerciseRow(index, 'maxReps', parseInt(val) || 0)}
                        keyboardType="number-pad"
                        placeholder="12"
                        placeholderTextColor="#71717a"
                        className="bg-zinc-900 border border-dark-border text-dark-text rounded-xl p-2.5 text-xs font-semibold"
                      />
                    </View>
                  </View>
                  <View>
                    <Text className="text-dark-muted text-[10px] font-bold uppercase mb-1">Target Muscle Group</Text>
                    <TextInput
                      value={ex.targetMuscleGroup}
                      onChangeText={(val) => handleUpdateExerciseRow(index, 'targetMuscleGroup', val)}
                      placeholder="e.g. Quads"
                      placeholderTextColor="#71717a"
                      className="bg-zinc-900 border border-dark-border text-dark-text rounded-xl p-2.5 text-xs font-semibold"
                    />
                  </View>
                </View>
              ) : (
                <View>
                  <Text className="text-dark-muted text-[10px] font-bold uppercase mb-1">Duration (minutes)</Text>
                  <TextInput
                    value={String(ex.cardioDurationMinutes)}
                    onChangeText={(val) => handleUpdateExerciseRow(index, 'cardioDurationMinutes', parseInt(val) || 0)}
                    keyboardType="number-pad"
                    placeholder="30"
                    placeholderTextColor="#71717a"
                    className="bg-zinc-900 border border-dark-border text-dark-text rounded-xl p-2.5 text-xs font-semibold"
                  />
                </View>
              )}
            </View>
          ))}
        </View>
      </Modal>

      {/* Edit Routine Modal */}
      <Modal
        visible={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingRoutine(null);
        }}
        title="Edit Routine"
        footer={
          <React.Fragment>
            <Button
              title="Delete Routine"
              variant="danger"
              onPress={handleDeleteRoutinePress}
              size="sm"
            />
            <Button
              title="Done"
              variant="primary"
              onPress={() => {
                setShowEditModal(false);
                setEditingRoutine(null);
              }}
              size="sm"
            />
          </React.Fragment>
        }
      >
        {editingRoutine && (
          <View className="gap-4 pb-6">
            {/* Edit Details Section */}
            <View className="bg-zinc-900/20 border border-dark-border/60 p-4 rounded-2xl gap-3">
              <Text className="text-dark-text font-black text-xs uppercase tracking-wider">Routine Details</Text>
              
              <View>
                <Text className="text-dark-muted text-[10px] font-bold uppercase mb-1">Routine Name *</Text>
                <TextInput
                  value={editRoutineName}
                  onChangeText={setEditRoutineName}
                  placeholder="e.g. Push Routine"
                  placeholderTextColor="#71717a"
                  className="bg-zinc-900 border border-dark-border text-dark-text rounded-xl p-2.5 text-xs font-semibold"
                />
              </View>

              <View>
                <Text className="text-dark-muted text-[10px] font-bold uppercase mb-1">Focus / Notes</Text>
                <TextInput
                  value={editRoutineFocus}
                  onChangeText={setEditRoutineFocus}
                  placeholder="e.g. Focus on chest thickness"
                  placeholderTextColor="#71717a"
                  className="bg-zinc-900 border border-dark-border text-dark-text rounded-xl p-2.5 text-xs font-semibold"
                />
              </View>

              <Button
                title="Save Details"
                variant="outline"
                size="sm"
                onPress={handleSaveRoutineDetails}
              />
            </View>

            {/* Current Exercises List */}
            <View>
              <Text className="text-dark-text font-black text-sm tracking-tight mb-2 uppercase">Current Exercises</Text>
              {(() => {
                const liveDay = activePlan?.days?.find((d) => d.id === editingRoutine.id);
                const liveExercises = liveDay?.exercises || [];

                if (liveExercises.length === 0) {
                  return (
                    <Text className="text-dark-muted text-xs italic my-2">No exercises in this routine.</Text>
                  );
                }

                return liveExercises.map((ex) => (
                  <View
                    key={ex.id}
                    className="flex-row justify-between items-center bg-zinc-900 border border-dark-border/40 p-3 rounded-xl mb-2"
                  >
                    <View className="flex-1 mr-2">
                      <Text className="text-dark-text font-bold text-xs">{ex.name}</Text>
                      <Text className="text-dark-muted text-[10px] mt-0.5">
                        {ex.category === 'strength'
                          ? `${ex.targetSets} sets × ${ex.minReps}-${ex.maxReps} reps • ${ex.targetMuscleGroup || 'General'}`
                          : `${ex.cardioDurationMinutes} mins • Cardio`}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => deleteExerciseFromDay(editingRoutine.id, ex.id)}
                      className="w-7 h-7 rounded-lg bg-red-950/20 border border-red-500/20 items-center justify-center active:bg-red-950/40"
                    >
                      <Ionicons name="trash-outline" size={14} color="#f87171" />
                    </Pressable>
                  </View>
                ));
              })()}
            </View>

            {/* Add Exercise on the Fly Section */}
            <View className="border border-dark-border/60 bg-zinc-900/40 p-4 rounded-2xl gap-3">
              <Text className="text-brand font-black text-xs uppercase tracking-wider">Add Exercise On The Fly</Text>

              <View>
                <Text className="text-dark-muted text-[10px] font-bold uppercase mb-1">Exercise Name *</Text>
                <TextInput
                  value={addExName}
                  onChangeText={setAddExName}
                  placeholder="e.g. Cable Curls"
                  placeholderTextColor="#71717a"
                  className="bg-zinc-900 border border-dark-border text-dark-text rounded-xl p-2.5 text-xs font-semibold"
                />
              </View>

              <View>
                <Text className="text-dark-muted text-[10px] font-bold uppercase mb-1">Category</Text>
                <View className="flex-row gap-2">
                  <Pressable
                    onPress={() => setAddExCategory('strength')}
                    className={`flex-1 py-2 rounded-xl border ${
                      addExCategory === 'strength' ? 'bg-brand/20 border-brand' : 'bg-zinc-900 border-dark-border'
                    }`}
                  >
                    <Text className={`text-center text-xs font-bold ${addExCategory === 'strength' ? 'text-brand' : 'text-dark-muted'}`}>
                      Strength
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setAddExCategory('cardio')}
                    className={`flex-1 py-2 rounded-xl border ${
                      addExCategory === 'cardio' ? 'bg-brand/20 border-brand' : 'bg-zinc-900 border-dark-border'
                    }`}
                  >
                    <Text className={`text-center text-xs font-bold ${addExCategory === 'cardio' ? 'text-brand' : 'text-dark-muted'}`}>
                      Cardio
                    </Text>
                  </Pressable>
                </View>
              </View>

              {addExCategory === 'strength' ? (
                <View className="gap-3">
                  <View className="flex-row gap-2">
                    <View className="flex-1">
                      <Text className="text-dark-muted text-[10px] font-bold uppercase mb-1">Sets</Text>
                      <TextInput
                        value={addExSets}
                        onChangeText={setAddExSets}
                        keyboardType="number-pad"
                        placeholder="3"
                        placeholderTextColor="#71717a"
                        className="bg-zinc-900 border border-dark-border text-dark-text rounded-xl p-2.5 text-xs font-semibold"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-dark-muted text-[10px] font-bold uppercase mb-1">Min Reps</Text>
                      <TextInput
                        value={addExMinReps}
                        onChangeText={setAddExMinReps}
                        keyboardType="number-pad"
                        placeholder="8"
                        placeholderTextColor="#71717a"
                        className="bg-zinc-900 border border-dark-border text-dark-text rounded-xl p-2.5 text-xs font-semibold"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-dark-muted text-[10px] font-bold uppercase mb-1">Max Reps</Text>
                      <TextInput
                        value={addExMaxReps}
                        onChangeText={setAddExMaxReps}
                        keyboardType="number-pad"
                        placeholder="12"
                        placeholderTextColor="#71717a"
                        className="bg-zinc-900 border border-dark-border text-dark-text rounded-xl p-2.5 text-xs font-semibold"
                      />
                    </View>
                  </View>
                  <View>
                    <Text className="text-dark-muted text-[10px] font-bold uppercase mb-1">Target Muscle Group</Text>
                    <TextInput
                      value={addExMuscle}
                      onChangeText={setAddExMuscle}
                      placeholder="e.g. Biceps"
                      placeholderTextColor="#71717a"
                      className="bg-zinc-900 border border-dark-border text-dark-text rounded-xl p-2.5 text-xs font-semibold"
                    />
                  </View>
                </View>
              ) : (
                <View>
                  <Text className="text-dark-muted text-[10px] font-bold uppercase mb-1">Duration (minutes)</Text>
                  <TextInput
                    value={addExCardioDuration}
                    onChangeText={setAddExCardioDuration}
                    keyboardType="number-pad"
                    placeholder="30"
                    placeholderTextColor="#71717a"
                    className="bg-zinc-900 border border-dark-border text-dark-text rounded-xl p-2.5 text-xs font-semibold"
                  />
                </View>
              )}

              <Button
                title="Add Exercise"
                variant="outline"
                size="sm"
                onPress={handleAddExerciseToRoutine}
              />
            </View>
          </View>
        )}
      </Modal>

      {/* Confirmation Modal to Override Session */}
      <Modal
        visible={showOverrideModal}
        onClose={() => setShowOverrideModal(false)}
        title="Workout In Progress"
        footer={
          <React.Fragment>
            <Button
              title="Cancel"
              variant="ghost"
              onPress={() => setShowOverrideModal(false)}
              size="sm"
            />
            <Button
              title="Start New"
              variant="danger"
              onPress={confirmOverride}
              size="sm"
            />
          </React.Fragment>
        }
      >
        <Text className="text-dark-text text-sm leading-relaxed mb-1">
          You currently have an active session in progress.
        </Text>
        <Text className="text-red-400 text-xs font-semibold">
          Warning: Starting a new workout will cancel the current active session and lose any unsaved sets.
        </Text>
      </Modal>

      {/* Bottom spacer */}
      <View className="h-16" />
    </ScrollView>
  );
};

