import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import { useWorkoutStore } from '../store/workoutStore';
import { Card } from './common/Card';

export const RestTimer: React.FC = () => {
  const restTimer = useWorkoutStore((state) => state.restTimer);
  const startRestTimer = useWorkoutStore((state) => state.startRestTimer);
  const stopRestTimer = useWorkoutStore((state) => state.stopRestTimer);
  
  // Local state to track remaining seconds when paused
  const [pausedSeconds, setPausedSeconds] = useState<number>(0);
  const [totalDuration, setTotalDuration] = useState<number>(0);

  // Pulsing animation for the active rest timer circle
  const glowAnim = useRef(new Animated.Value(0)).current;

  const isTimerActive = restTimer.secondsRemaining > 0 || pausedSeconds > 0;
  const isPaused = pausedSeconds > 0;

  useEffect(() => {
    if (restTimer.isRunning) {
      setPausedSeconds(0);
      if (restTimer.duration > 0 && totalDuration !== restTimer.duration) {
        setTotalDuration(restTimer.duration);
      }
    }
  }, [restTimer.isRunning, restTimer.duration]);

  useEffect(() => {
    let anim: Animated.CompositeAnimation | null = null;
    if (restTimer.isRunning && !isPaused) {
      anim = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      anim.start();
    } else {
      glowAnim.setValue(0);
    }
    return () => {
      if (anim) {
        anim.stop();
      }
    };
  }, [restTimer.isRunning, isPaused, glowAnim]);

  const glowScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.12],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.6],
  });

  const currentSeconds = isPaused ? pausedSeconds : restTimer.secondsRemaining;
  const activeDuration = totalDuration || 90;

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handlePauseToggle = () => {
    if (restTimer.isRunning) {
      // Pause: Save remaining seconds locally and stop store timer
      setPausedSeconds(restTimer.secondsRemaining);
      stopRestTimer();
    } else if (isPaused) {
      // Resume: Start timer with the saved remaining seconds
      startRestTimer(pausedSeconds);
      setPausedSeconds(0);
    }
  };

  const handleSkip = () => {
    stopRestTimer();
    setPausedSeconds(0);
    setTotalDuration(0);
  };

  const handleAdd30s = () => {
    const nextSeconds = currentSeconds + 30;
    setTotalDuration(prev => prev + 30);
    if (restTimer.isRunning) {
      startRestTimer(nextSeconds);
    } else {
      setPausedSeconds(nextSeconds);
    }
  };

  const progress = activeDuration > 0 ? (currentSeconds / activeDuration) * 100 : 0;

  if (!isTimerActive) {
    // Return a neat selector for starting a manual rest timer
    return (
      <Card className="border-brand/30 bg-zinc-900/60 py-3.5 mb-5">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-dark-text font-bold text-sm">Rest Timer</Text>
            <Text className="text-dark-muted text-xs">Ready for your next set</Text>
          </View>
          <View className="flex-row gap-2">
            {[60, 90, 120].map((s) => (
              <Pressable
                key={s}
                onPress={() => {
                  setTotalDuration(s);
                  startRestTimer(s);
                }}
                className="bg-zinc-800 border border-dark-border px-3 py-1.5 rounded-lg active:bg-zinc-700"
              >
                <Text className="text-brand font-semibold text-xs">{s}s</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Card>
    );
  }

  return (
    <Card className="border-brand/40 bg-zinc-900/80 mb-5 overflow-hidden">
      {/* Background progress indicator bar */}
      <View 
        className="absolute left-0 top-0 bottom-0 bg-brand/10 transition-all duration-300"
        style={{ width: `${progress}%` }}
      />
      
      <View className="flex-row items-center justify-between relative z-10">
        <View className="flex-row items-center gap-3">
          <Animated.View 
            style={{ transform: [{ scale: glowScale }], opacity: glowOpacity }}
            className="w-12 h-12 rounded-full border border-brand items-center justify-center bg-black/40"
          >
            <Text className="text-brand font-bold text-sm tracking-tighter">
              {formatTime(currentSeconds)}
            </Text>
          </Animated.View>
          <View>
            <Text className="text-dark-text font-semibold text-sm">
              {isPaused ? 'Timer Paused' : 'Resting...'}
            </Text>
            <Text className="text-dark-muted text-xs">
              Target: {formatTime(activeDuration)}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-2">
          {/* Pause / Resume Button */}
          <Pressable
            onPress={handlePauseToggle}
            className="bg-brand/20 border border-brand/40 px-3.5 py-1.5 rounded-xl active:bg-brand/30"
          >
            <Text className="text-brand font-bold text-xs">
              {isPaused ? 'Resume' : 'Pause'}
            </Text>
          </Pressable>

          {/* +30s Button */}
          <Pressable
            onPress={handleAdd30s}
            className="bg-zinc-800 border border-dark-border px-2.5 py-1.5 rounded-xl active:bg-zinc-700"
          >
            <Text className="text-dark-text font-bold text-xs">+30s</Text>
          </Pressable>

          {/* Skip Button */}
          <Pressable
            onPress={handleSkip}
            className="bg-red-950/20 border border-red-500/20 px-2.5 py-1.5 rounded-xl active:bg-red-950/40"
          >
            <Text className="text-red-400 font-semibold text-xs">Skip</Text>
          </Pressable>
        </View>
      </View>
    </Card>
  );
};
