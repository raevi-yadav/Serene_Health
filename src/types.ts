export type ExerciseIntensity = 'Low' | 'Medium' | 'High';

export interface Meal {
  id: string;
  name: string;
  calories: number;
  protein?: number; // in grams
  carbs?: number;   // in grams
  fat?: number;     // in grams
  sodium?: number;  // in mg
  cholesterol?: number; // in mg
  fiber?: number;   // in grams
  sugar?: number;   // in grams
  weightGrams?: number; // weight in grams
}

export interface SleepRecord {
  hours: number;
  quality: number; // 1 to 5
  sleepTime: string; // "HH:MM"
  wakeTime: string; // "HH:MM"
}

export interface DietRecord {
  calories: number;
  meals: Meal[];
}

export interface WaterRecord {
  totalMl: number;
  glassSizeMl: number; // Default glass size (250, 500, 750)
}

export interface WeightRecord {
  kg: number | null;
}

export interface ExerciseRecord {
  durationMinutes: number;
  type: string; // e.g., "Cardio", "Strength", "Flexibility", "Yoga", "Walk"
  intensity: ExerciseIntensity;
}

export interface DailyRecord {
  date: string; // "YYYY-MM-DD"
  sleep: SleepRecord;
  diet: DietRecord;
  water: WaterRecord;
  weight: WeightRecord;
  exercise: ExerciseRecord;
  reflection?: string;
}

export interface UserSettings {
  defaultGlassSizeMl: number; // 250, 500, or 750
  targetWaterMl: number;
  targetSleepHours: number;
  targetCalories: number;
  targetExerciseMinutes: number;
  targetWeightKg?: number;
  targetExerciseDaysPerWeek?: number;
  heightCm?: number;
  enableHealthConnectAutoSync?: boolean;
}
