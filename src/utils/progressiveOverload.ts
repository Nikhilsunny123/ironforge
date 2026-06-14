import { ExerciseSet } from '../types';

/**
 * Determines if a muscle group is considered upper body or lower body.
 */
export const isUpperBody = (muscleGroup?: string): boolean => {
  if (!muscleGroup) return true; // Default to upper body if not specified
  
  const lowerBodyGroups = [
    'legs', 
    'quads', 
    'quadriceps', 
    'hamstrings', 
    'calves', 
    'glutes', 
    'lower body', 
    'calves and core',
    'legs & core',
    'core',
    'abs'
  ];
  
  const group = muscleGroup.toLowerCase();
  return !lowerBodyGroups.some(item => group.includes(item));
};

/**
 * Calculates the suggested weight for the next session based on progressive overload rules.
 * 
 * Progressive Overload Rules:
 * - If the user reaches the upper rep range (maxReps) for all sets:
 *   - Upper body exercises: Increase weight by 2.5kg
 *   - Lower body exercises: Increase weight by 5kg
 * - Otherwise:
 *   - Keep the same weight.
 */
export const calculateNextWeight = (
  targetMuscleGroup: string | undefined,
  completedSets: ExerciseSet[],
  maxReps: number,
  currentWeight: number
): { nextWeight: number; isIncreased: boolean; reason: string } => {
  if (completedSets.length === 0) {
    return { nextWeight: currentWeight, isIncreased: false, reason: 'No completed sets recorded.' };
  }

  // Check if all sets hit or exceeded the max reps
  const allSetsMaxed = completedSets.every(set => set.isCompleted && (set.reps ?? 0) >= maxReps);

  if (allSetsMaxed) {
    const upper = isUpperBody(targetMuscleGroup);
    const increment = upper ? 2.5 : 5.0;
    const nextWeight = currentWeight + increment;
    return {
      nextWeight,
      isIncreased: true,
      reason: `All sets hit upper limit of ${maxReps} reps! Weight increased by ${increment}kg (${upper ? 'Upper Body' : 'Lower Body'}).`
    };
  }

  // Not all sets hit the max reps, keep the same weight
  return {
    nextWeight: currentWeight,
    isIncreased: false,
    reason: `Hit ${maxReps} reps on all sets to increase weight. Current weight maintained.`
  };
};
