import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Pressable, Animated } from 'react-native';
import { ExerciseSet } from '../types';

interface SetRowProps {
  set: ExerciseSet;
  index: number;
  previousPerformance?: string;
  targetRepsRange?: string;
  onUpdate: (updates: Partial<ExerciseSet>) => void;
  onToggleComplete: () => void;
  onRemove: () => void;
}

export const SetRow: React.FC<SetRowProps> = ({
  set,
  index,
  previousPerformance = '--',
  targetRepsRange = '',
  onUpdate,
  onToggleComplete,
  onRemove,
}) => {
  const [weightText, setWeightText] = useState<string>(set.weight?.toString() || '');
  const [repsText, setRepsText] = useState<string>(set.reps?.toString() || '');

  // Synchronize state with props when active session updates
  useEffect(() => {
    setWeightText(set.weight?.toString() || '');
  }, [set.weight]);

  useEffect(() => {
    setRepsText(set.reps?.toString() || '');
  }, [set.reps]);

  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (set.isCompleted) {
      scale.setValue(0.7);
      Animated.spring(scale, {
        toValue: 1.0,
        friction: 3,
        tension: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [set.isCompleted, scale]);

  const handleWeightChange = (text: string) => {
    // Keep numbers and decimals only
    const cleanText = text.replace(/[^0-9.]/g, '');
    setWeightText(cleanText);
    const val = parseFloat(cleanText);
    onUpdate({ weight: isNaN(val) ? undefined : val });
  };

  const handleRepsChange = (text: string) => {
    // Keep digits only
    const cleanText = text.replace(/[^0-9]/g, '');
    setRepsText(cleanText);
    const val = parseInt(cleanText, 10);
    onUpdate({ reps: isNaN(val) ? undefined : val });
  };

  return (
    <View 
      className={`flex-row items-center justify-between py-2.5 border-b border-dark-border/40 ${
        set.isCompleted ? 'bg-emerald-950/10' : ''
      }`}
    >
      {/* Set Number */}
      <View className="w-8 items-center justify-center">
        <Text className="text-dark-text font-bold text-xs bg-zinc-800 w-6 h-6 rounded-full text-center leading-6">
          {index + 1}
        </Text>
      </View>

      {/* Target/Previous Performance */}
      <View className="flex-1 px-2">
        <Text className="text-dark-muted text-xs font-medium" numberOfLines={1}>
          Prev: {previousPerformance}
        </Text>
        {targetRepsRange ? (
          <Text className="text-brand font-semibold text-[10px] uppercase tracking-wider">
            Target: {targetRepsRange} r
          </Text>
        ) : null}
      </View>

      {/* Weight Input */}
      <View className="w-20 px-1">
        <View className="flex-row items-center bg-zinc-900 border border-dark-border rounded-lg px-2 h-9">
          <TextInput
            value={weightText}
            onChangeText={handleWeightChange}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor="#71717a"
            editable={!set.isCompleted}
            className="flex-1 text-dark-text text-center text-sm font-semibold p-0 h-full"
          />
          <Text className="text-zinc-500 text-[10px] font-medium ml-0.5">kg</Text>
        </View>
      </View>

      {/* Reps Input */}
      <View className="w-18 px-1">
        <View className="flex-row items-center bg-zinc-900 border border-dark-border rounded-lg px-2 h-9">
          <TextInput
            value={repsText}
            onChangeText={handleRepsChange}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor="#71717a"
            editable={!set.isCompleted}
            className="flex-1 text-dark-text text-center text-sm font-semibold p-0 h-full"
          />
          <Text className="text-zinc-500 text-[10px] font-medium ml-0.5">reps</Text>
        </View>
      </View>

      {/* Action Buttons: Toggle and Delete */}
      <View className="flex-row items-center gap-1.5 pl-2">
        {/* Toggle Completion */}
        <Animated.View style={{ transform: [{ scale }] }}>
          <Pressable
            onPress={onToggleComplete}
            className={`w-9 h-9 rounded-xl items-center justify-center border transition-all ${
              set.isCompleted
                ? 'bg-emerald-600 border-emerald-500'
                : 'border-zinc-700 bg-zinc-900 active:bg-zinc-800'
            }`}
          >
            {set.isCompleted ? (
              <Text className="text-white font-bold text-sm">✓</Text>
            ) : (
              <Text className="text-zinc-600 text-xs">✓</Text>
            )}
          </Pressable>
        </Animated.View>

        {/* Delete Set */}
        {!set.isCompleted && (
          <Pressable
            onPress={onRemove}
            className="w-7 h-9 items-center justify-center rounded-lg active:bg-red-950/20"
          >
            <Text className="text-red-500/80 font-bold text-base">×</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};
