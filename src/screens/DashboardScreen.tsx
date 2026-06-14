import React, { useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, Dimensions, Animated } from 'react-native';
import { useWorkoutStore } from '../store/workoutStore';
import { useMeasurementStore } from '../store/measurementStore';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { useNavigation } from '@react-navigation/native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';

const SCREEN_WIDTH = Dimensions.get('window').width;

export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const workoutLogs = useWorkoutStore((state) => state.workoutLogs);
  const personalRecords = useWorkoutStore((state) => state.personalRecords);
  const plans = useWorkoutStore((state) => state.plans);
  const measurements = useMeasurementStore((state) => state.measurements);

  // Pulse animation for the streak flame badge
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const flameScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.25],
  });

  const flameOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 1],
  });

  // 1. Current Weight
  const currentWeight = measurements.length > 0 && measurements[0].weight
    ? `${measurements[0].weight} kg`
    : '-- kg';

  // 2. Workout Streak Calculation
  const calculateStreak = () => {
    if (workoutLogs.length === 0) return 0;
    
    // Extract unique sorted ISO dates when workouts were completed
    const completedDates = workoutLogs
      .filter((log) => log.completedAt)
      .map((log) => new Date(log.completedAt!).toDateString());
    
    const uniqueDates = Array.from(new Set(completedDates)).map(d => new Date(d));
    uniqueDates.sort((a, b) => b.getTime() - a.getTime()); // Newest first

    if (uniqueDates.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const newestWorkoutDate = uniqueDates[0];
    newestWorkoutDate.setHours(0, 0, 0, 0);

    // If last workout was before yesterday, streak is broken (0)
    if (newestWorkoutDate.getTime() < yesterday.getTime()) {
      return 0;
    }

    let streak = 1;
    let currentDate = newestWorkoutDate;

    for (let i = 1; i < uniqueDates.length; i++) {
      const prevDate = uniqueDates[i];
      prevDate.setHours(0, 0, 0, 0);
      
      const diffTime = currentDate.getTime() - prevDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        streak++;
        currentDate = prevDate;
      } else if (diffDays > 1) {
        break; // Streak broken in the past
      }
    }
    return streak;
  };

  const streak = calculateStreak();

  // 3. Current Program & Next Workout Day
  const activePlan = plans.find((p) => p.isActive);
  const programName = activePlan ? activePlan.name : 'No Active Program';
  
  const getNextWorkoutName = () => {
    if (!activePlan || !activePlan.days || activePlan.days.length === 0) {
      return 'Start a custom workout';
    }
    if (workoutLogs.length === 0) {
      return activePlan.days[0].name;
    }
    // Find last logged day that belongs to the active plan
    const completedLogs = workoutLogs.filter((log) => log.completedAt);
    if (completedLogs.length === 0) {
      return activePlan.days[0].name;
    }
    const lastLog = completedLogs[completedLogs.length - 1];
    const lastDayIndex = activePlan.days.findIndex((d) => d.id === lastLog.workoutDayId);
    if (lastDayIndex === -1 || lastDayIndex === activePlan.days.length - 1) {
      return activePlan.days[0].name; // Loop back to start
    }
    return activePlan.days[lastDayIndex + 1].name;
  };

  const nextWorkoutName = getNextWorkoutName();

  // 4. Statistics
  const totalWeightLifted = workoutLogs.reduce((sum, log) => {
    const logVolume = log.sets
      ?.filter((s) => s.isCompleted)
      .reduce((vol, set) => vol + (set.weight || 0) * (set.reps || 0), 0) || 0;
    return sum + logVolume;
  }, 0);

  // Volume calculations for charts
  const getWeeklyVolumeData = () => {
    // Last 7 days volume
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const volumeByDay = [0, 0, 0, 0, 0, 0, 0];
    const now = new Date();
    
    // Start of current week (Monday)
    const currentDay = now.getDay();
    const distanceToMon = currentDay === 0 ? 6 : currentDay - 1;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - distanceToMon);
    startOfWeek.setHours(0, 0, 0, 0);

    workoutLogs.forEach((log) => {
      if (!log.completedAt) return;
      const logDate = new Date(log.completedAt);
      if (logDate >= startOfWeek) {
        const logDay = logDate.getDay(); // 0 is Sun, 1 is Mon, etc.
        const dayIdx = logDay === 0 ? 6 : logDay - 1;
        const volume = log.sets
          ?.filter((s) => s.isCompleted)
          .reduce((v, s) => v + (s.weight || 0) * (s.reps || 0), 0) || 0;
        volumeByDay[dayIdx] += volume;
      }
    });

    return days.map((day, idx) => ({ label: day, value: volumeByDay[idx] }));
  };

  const getMonthlyVolumeData = () => {
    // Last 4 weeks volume
    const weeks = ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'];
    const volumeByWeek = [0, 0, 0, 0];
    const now = new Date();

    workoutLogs.forEach((log) => {
      if (!log.completedAt) return;
      const logDate = new Date(log.completedAt);
      const diffTime = now.getTime() - logDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 28) {
        const weekIdx = 3 - Math.floor(diffDays / 7); // 0 to 3
        if (weekIdx >= 0 && weekIdx < 4) {
          const volume = log.sets
            ?.filter((s) => s.isCompleted)
            .reduce((v, s) => v + (s.weight || 0) * (s.reps || 0), 0) || 0;
          volumeByWeek[weekIdx] += volume;
        }
      }
    });

    return weeks.map((week, idx) => ({ label: week, value: volumeByWeek[idx] }));
  };

  const getWorkoutFrequencyData = () => {
    // Number of workouts per week for last 4 weeks
    const weeks = ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'];
    const countByWeek = [0, 0, 0, 0];
    const now = new Date();

    workoutLogs.forEach((log) => {
      if (!log.completedAt) return;
      const logDate = new Date(log.completedAt);
      const diffTime = now.getTime() - logDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 28) {
        const weekIdx = 3 - Math.floor(diffDays / 7);
        if (weekIdx >= 0 && weekIdx < 4) {
          countByWeek[weekIdx] += 1;
        }
      }
    });

    return weeks.map((week, idx) => ({ label: week, value: countByWeek[idx] }));
  };

  const weeklyVolume = getWeeklyVolumeData();
  const monthlyVolume = getMonthlyVolumeData();
  const freqData = getWorkoutFrequencyData();

  // Premium SVG Render Bar Chart Component
  const renderSVGChart = (data: { label: string; value: number }[], height: number, color: string, isInteger = false) => {
    const chartWidth = SCREEN_WIDTH - 64;
    const padding = 20;
    const graphWidth = chartWidth - padding * 2;
    const graphHeight = height - padding * 2;
    const maxValue = Math.max(...data.map(d => d.value), 10);
    const barWidth = (graphWidth / data.length) * 0.6;
    const barSpacing = (graphWidth / data.length) * 0.4;

    return (
      <View className="items-center mt-2">
        <Svg width={chartWidth} height={height}>
          {/* Baseline */}
          <Line
            x1={padding}
            y1={height - padding}
            x2={chartWidth - padding}
            y2={height - padding}
            stroke="#27272a"
            strokeWidth="1"
          />
          {/* Top Line */}
          <Line
            x1={padding}
            y1={padding}
            x2={chartWidth - padding}
            y2={padding}
            stroke="#27272a"
            strokeWidth="0.5"
            strokeDasharray="4 4"
          />
          
          {data.map((item, idx) => {
            const barHeight = (item.value / maxValue) * graphHeight;
            const x = padding + idx * (barWidth + barSpacing) + barSpacing / 2;
            const y = height - padding - barHeight;

            return (
              <React.Fragment key={idx}>
                {/* Bar */}
                <Rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill={color}
                  rx="4"
                />
                {/* Value Text */}
                {item.value > 0 && (
                  <SvgText
                    x={x + barWidth / 2}
                    y={y - 4}
                    fill="#f4f4f5"
                    fontSize="9"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {isInteger ? Math.round(item.value) : `${Math.round(item.value)}kg`}
                  </SvgText>
                )}
                {/* X Label */}
                <SvgText
                  x={x + barWidth / 2}
                  y={height - 4}
                  fill="#a1a1aa"
                  fontSize="10"
                  textAnchor="middle"
                >
                  {item.label}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
      </View>
    );
  };

  return (
    <ScrollView className="flex-1 bg-dark-bg px-4 py-6">
      {/* Header Profile / Streak */}
      <View className="flex-row justify-between items-center mb-6">
        <View>
          <Text className="text-dark-text text-2xl font-black tracking-tight">IRONFORGE</Text>
          <Text className="text-dark-muted text-sm">Forge your ultimate self</Text>
        </View>
        <View className="flex-row items-center bg-zinc-900 border border-dark-border px-3 py-2 rounded-2xl gap-1.5 shadow-lg">
          <Animated.View style={{ transform: [{ scale: flameScale }], opacity: flameOpacity }}>
            <Text className="text-xl">🔥</Text>
          </Animated.View>
          <View>
            <Text className="text-[10px] text-dark-muted uppercase font-bold tracking-wider">Streak</Text>
            <Text className="text-dark-text font-black text-sm">{streak} Days</Text>
          </View>
        </View>
      </View>

      {/* Quick Stats Grid */}
      <View className="flex-row flex-wrap justify-between gap-3 mb-5">
        <Card className="flex-1 min-w-[46%] p-3 mb-0" subtitle="Current Weight">
          <View className="flex-row items-baseline mt-1">
            <Text className="text-2xl font-black text-brand tracking-tighter">{currentWeight}</Text>
          </View>
        </Card>
        <Card className="flex-1 min-w-[46%] p-3 mb-0" subtitle="Personal Records">
          <View className="flex-row items-baseline mt-1">
            <Text className="text-2xl font-black text-brand tracking-tighter">{personalRecords.length}</Text>
            <Text className="text-[10px] text-dark-muted font-bold ml-1 uppercase">PRs</Text>
          </View>
        </Card>
        <Card className="flex-1 min-w-[46%] p-3 mb-0" subtitle="Total Weight Lifted">
          <View className="flex-row items-baseline mt-1">
            <Text className="text-2xl font-black text-brand tracking-tighter">
              {totalWeightLifted >= 1000 ? `${(totalWeightLifted / 1000).toFixed(1)}t` : `${totalWeightLifted}kg`}
            </Text>
          </View>
        </Card>
        <Card className="flex-1 min-w-[46%] p-3 mb-0" subtitle="Completed Workouts">
          <View className="flex-row items-baseline mt-1">
            <Text className="text-2xl font-black text-brand tracking-tighter">
              {workoutLogs.filter(l => l.completedAt).length}
            </Text>
          </View>
        </Card>
      </View>

      {/* Program Summary Card */}
      <Card title="Current Plan" headerRight={<Badge label="Active" variant="success" />} className="mb-5 border-l-4 border-l-brand">
        <Text className="text-dark-text font-bold text-lg mb-1">{programName}</Text>
        <Text className="text-dark-muted text-xs mb-3">
          {activePlan?.description || 'No workout program selected.'}
        </Text>
        
        <View className="bg-zinc-950 border border-dark-border p-3.5 rounded-xl flex-row justify-between items-center mb-1">
          <View>
            <Text className="text-[10px] text-dark-muted uppercase font-bold tracking-wider">Next Workout</Text>
            <Text className="text-dark-text font-bold text-sm mt-0.5">{nextWorkoutName}</Text>
          </View>
          <Button 
            title="Start" 
            onPress={() => navigation.navigate('Workouts')} 
            size="sm" 
          />
        </View>
      </Card>

      {/* Weekly Volume Chart */}
      <Card title="Weekly Volume" subtitle="Total weight lifted per day this week" className="mb-5">
        {workoutLogs.length === 0 ? (
          <View className="py-8 items-center justify-center">
            <Text className="text-dark-muted text-sm font-semibold">No logs recorded this week</Text>
          </View>
        ) : (
          renderSVGChart(weeklyVolume, 150, '#ea580c')
        )}
      </Card>

      {/* Monthly Volume Chart */}
      <Card title="Monthly Volume Trend" subtitle="Total weight lifted per week (last 4 weeks)" className="mb-5">
        {workoutLogs.length === 0 ? (
          <View className="py-8 items-center justify-center">
            <Text className="text-dark-muted text-sm font-semibold">No volume history available</Text>
          </View>
        ) : (
          renderSVGChart(monthlyVolume, 150, '#6366f1')
        )}
      </Card>

      {/* Workout Frequency Chart */}
      <Card title="Workout Frequency" subtitle="Workouts completed per week" className="mb-6">
        {workoutLogs.length === 0 ? (
          <View className="py-8 items-center justify-center">
            <Text className="text-dark-muted text-sm font-semibold">No workouts completed yet</Text>
          </View>
        ) : (
          renderSVGChart(freqData, 140, '#10b981', true)
        )}
      </Card>
      
      {/* Bottom spacer */}
      <View className="h-16" />
    </ScrollView>
  );
};
