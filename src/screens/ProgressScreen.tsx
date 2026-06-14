import React from 'react';
import { View, Text, ScrollView, Dimensions } from 'react-native';
import { useWorkoutStore } from '../store/workoutStore';
import { useMeasurementStore } from '../store/measurementStore';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import {
  VictoryChart,
  VictoryLine,
  VictoryBar,
  VictoryPie,
  VictoryAxis,
  VictoryTheme
} from 'victory-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 48;

export const ProgressScreen: React.FC = () => {
  const workoutLogs = useWorkoutStore((state) => state.workoutLogs);
  const personalRecords = useWorkoutStore((state) => state.personalRecords);
  const measurements = useMeasurementStore((state) => state.measurements);

  const completedLogs = workoutLogs.filter((log) => log.completedAt);

  // 1. Body Weight Data Setup (Line Chart)
  const getWeightChartData = () => {
    // Sort oldest first
    const sortedMeasurements = [...measurements]
      .filter((m) => m.weight !== undefined)
      .sort((a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime());

    return sortedMeasurements.map((m) => ({
      x: new Date(m.measuredAt).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      y: m.weight || 0,
    }));
  };

  const weightData = getWeightChartData();

  // 2. Total Session Volume Setup (Line Chart)
  const getVolumeChartData = () => {
    const sortedLogs = [...completedLogs]
      .sort((a, b) => new Date(a.completedAt!).getTime() - new Date(b.completedAt!).getTime());

    return sortedLogs.map((log) => {
      const volume = log.sets
        ?.filter((s) => s.isCompleted)
        .reduce((sum, s) => sum + (s.weight || 0) * (s.reps || 0), 0) || 0;
      
      return {
        x: new Date(log.completedAt!).toLocaleDateString([], { month: 'short', day: 'numeric' }),
        y: volume,
      };
    });
  };

  const volumeData = getVolumeChartData();

  // 3. Workout Frequency Setup (Bar Chart - completed workouts by week)
  const getFrequencyChartData = () => {
    const weeks = ['Wk 4 Ago', 'Wk 3 Ago', 'Wk 2 Ago', 'Wk 1 Ago'];
    const counts = [0, 0, 0, 0];
    const now = new Date();

    completedLogs.forEach((log) => {
      const logDate = new Date(log.completedAt!);
      const diffTime = now.getTime() - logDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 28) {
        const weekIdx = 3 - Math.floor(diffDays / 7);
        if (weekIdx >= 0 && weekIdx < 4) {
          counts[weekIdx] += 1;
        }
      }
    });

    return weeks.map((w, idx) => ({ x: w, y: counts[idx] }));
  };

  const frequencyData = getFrequencyChartData();

  // 4. Muscle Group Distribution (Pie Chart)
  const getMuscleDistribution = () => {
    const counts: Record<string, number> = {};
    
    completedLogs.forEach((log) => {
      log.sets?.filter((s) => s.isCompleted).forEach((set) => {
        // Map common exercises to their main muscle groups
        const exName = set.exerciseName.toLowerCase();
        let muscle = 'Other';

        if (exName.includes('bench') || exName.includes('chest') || exName.includes('fly')) {
          muscle = 'Chest';
        } else if (exName.includes('deadlift') || exName.includes('row') || exName.includes('pull-up') || exName.includes('lat pulldown') || exName.includes('back')) {
          muscle = 'Back';
        } else if (exName.includes('press') || exName.includes('lateral') || exName.includes('delt') || exName.includes('shoulder')) {
          muscle = 'Shoulders';
        } else if (exName.includes('squat') || exName.includes('leg') || exName.includes('lunges') || exName.includes('quad')) {
          muscle = 'Legs';
        } else if (exName.includes('curl') || exName.includes('bicep') || exName.includes('hammer')) {
          muscle = 'Biceps';
        } else if (exName.includes('tricep') || exName.includes('pushdown') || exName.includes('extension')) {
          muscle = 'Triceps';
        } else if (exName.includes('abs') || exName.includes('raise') || exName.includes('crunch') || exName.includes('wheel')) {
          muscle = 'Abs';
        }

        counts[muscle] = (counts[muscle] || 0) + 1;
      });
    });

    const totalSets = Object.values(counts).reduce((s, c) => s + c, 0);
    if (totalSets === 0) return [];

    return Object.entries(counts).map(([name, count]) => ({
      x: name,
      y: parseFloat(((count / totalSets) * 100).toFixed(0)),
    }));
  };

  const muscleData = getMuscleDistribution();

  // Color scheme matching tailwind.config
  const victoryThemeDark: any = {
    ...VictoryTheme.material,
    axis: {
      style: {
        axis: { stroke: '#27272a' },
        grid: { stroke: '#27272a', strokeWidth: 0.5, strokeDasharray: '3, 3' },
        ticks: { stroke: '#27272a' },
        tickLabels: { fill: '#a1a1aa', fontSize: 8, padding: 4 },
      },
    },
  };

  return (
    <ScrollView className="flex-1 bg-dark-bg px-4 py-6">
      {/* Header */}
      <View className="mb-6">
        <Text className="text-dark-text text-2xl font-black tracking-tight">PROGRESS INSIGHTS</Text>
        <Text className="text-dark-muted text-sm">Visualize your fitness journey</Text>
      </View>

      {/* 1. Body Weight Trend Chart */}
      <Card title="Body Weight Trend" subtitle="Progress history of logged weights">
        {weightData.length < 2 ? (
          <View className="py-10 items-center justify-center">
            <Text className="text-dark-muted text-xs text-center px-4">
              Add at least 2 body weight measurements in the Measurements tab to view weight trends.
            </Text>
          </View>
        ) : (
          <View className="items-center">
            <VictoryChart width={CHART_WIDTH} height={200} theme={victoryThemeDark}>
              <VictoryLine
                data={weightData}
                style={{
                  data: { stroke: '#ea580c', strokeWidth: 3 },
                }}
              />
              <VictoryAxis />
              <VictoryAxis dependentAxis tickFormat={(t: any) => `${t}kg`} />
            </VictoryChart>
          </View>
        )}
      </Card>

      {/* 2. Total Workout Session Volume Chart */}
      <Card title="Training Volume" subtitle="Total weight lifted (kg) per completed workout session">
        {volumeData.length < 2 ? (
          <View className="py-10 items-center justify-center">
            <Text className="text-dark-muted text-xs text-center px-4">
              Complete at least 2 workouts with logged sets to view volume trends.
            </Text>
          </View>
        ) : (
          <View className="items-center">
            <VictoryChart width={CHART_WIDTH} height={200} theme={victoryThemeDark}>
              <VictoryLine
                data={volumeData}
                style={{
                  data: { stroke: '#6366f1', strokeWidth: 3 },
                }}
              />
              <VictoryAxis />
              <VictoryAxis dependentAxis tickFormat={(t: any) => `${t}kg`} />
            </VictoryChart>
          </View>
        )}
      </Card>

      {/* 3. Workout Frequency Chart */}
      <Card title="Workout Frequency" subtitle="Workouts completed per week (last 4 weeks)">
        {completedLogs.length === 0 ? (
          <View className="py-10 items-center justify-center">
            <Text className="text-dark-muted text-xs text-center px-4">
              No workouts logged in the last 4 weeks.
            </Text>
          </View>
        ) : (
          <View className="items-center">
            <VictoryChart width={CHART_WIDTH} height={180} theme={victoryThemeDark} domainPadding={{ x: 20 }}>
              <VictoryBar
                data={frequencyData}
                style={{
                  data: { fill: '#10b981', width: 20 },
                }}
              />
              <VictoryAxis />
              <VictoryAxis dependentAxis />
            </VictoryChart>
          </View>
        )}
      </Card>

      {/* 4. Muscle Group Distribution Pie Chart */}
      <Card title="Volume Distribution" subtitle="Proportional set volume split by muscle groups">
        {muscleData.length === 0 ? (
          <View className="py-10 items-center justify-center">
            <Text className="text-dark-muted text-xs text-center px-4">
              Log completed exercises to see your muscle group distribution.
            </Text>
          </View>
        ) : (
          <View className="items-center py-2">
            <VictoryPie
              data={muscleData}
              width={CHART_WIDTH}
              height={220}
              colorScale={['#ea580c', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6b7280']}
              style={{
                labels: { fill: '#f4f4f5', fontSize: 10, fontWeight: 'bold' },
              }}
              labelRadius={({ innerRadius }: any) => (CHART_WIDTH * 0.45) / 2}
            />
          </View>
        )}
      </Card>

      {/* 5. PR History Chronological List */}
      <Card title="PR History" subtitle="Your recently unlocked Personal Records">
        {personalRecords.length === 0 ? (
          <View className="py-8 items-center justify-center">
            <Text className="text-dark-muted text-xs text-center">No personal records unlocked yet.</Text>
          </View>
        ) : (
          <View className="gap-2.5">
            {[...personalRecords]
              .sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime())
              .slice(0, 8)
              .map((pr) => (
                <View
                  key={pr.id}
                  className="flex-row justify-between items-center bg-zinc-950/60 border border-dark-border/40 p-3 rounded-xl"
                >
                  <View className="flex-1 mr-2">
                    <Text className="text-dark-text font-bold text-xs" numberOfLines={1}>
                      {pr.exerciseName}
                    </Text>
                    <Text className="text-dark-muted text-[10px] mt-0.5">
                      Type: <Text className="text-brand font-semibold capitalize">{pr.prType}</Text> •{' '}
                      {new Date(pr.loggedAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                  <Badge
                    label={`${pr.value} ${pr.prType === 'reps' ? 'reps' : 'kg'}`}
                    variant="success"
                  />
                </View>
              ))}
          </View>
        )}
      </Card>

      {/* Bottom spacer */}
      <View className="h-16" />
    </ScrollView>
  );
};
