import { DailyRecord } from '../types';

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateLabel(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatDayOfWeek(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

export function getPastWeekDates(): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
  }
  return dates;
}

export function getBlankDailyRecord(date: string, glassSizeMl: number = 250): DailyRecord {
  return {
    date,
    sleep: {
      hours: 7,
      quality: 3,
      sleepTime: '23:00',
      wakeTime: '06:00',
    },
    diet: {
      calories: 0,
      meals: [],
    },
    water: {
      totalMl: 0,
      glassSizeMl,
    },
    weight: {
      kg: null,
    },
    exercise: {
      durationMinutes: 0,
      type: 'Cardio',
      intensity: 'Medium',
    },
    reflection: '',
  };
}

export function generateSampleData(glassSizeMl: number = 250): Record<string, DailyRecord> {
  const dates = getPastWeekDates();
  const records: Record<string, DailyRecord> = {};
  
  // Sample variations
  const sleepHours = [6.5, 7.5, 8.0, 7.0, 6.0, 7.5, 8.0];
  const sleepQualities = [3, 4, 5, 4, 2, 4, 5];
  const sleepTimes = ['23:30', '23:00', '22:30', '23:15', '00:15', '23:00', '22:00'];
  const wakeTimes = ['06:00', '06:30', '06:30', '06:15', '06:15', '06:30', '06:00'];
  const waterAmounts = [1500, 2000, 2250, 1750, 1250, 2500, 2000];
  const exerciseMins = [30, 45, 0, 60, 20, 45, 15];
  const exerciseTypes = ['Cardio', 'Strength', 'Yoga', 'Cardio', 'Yoga', 'Strength', 'Cardio'];
  const exerciseIntensities: ('Low' | 'Medium' | 'High')[] = ['Medium', 'High', 'Low', 'High', 'Low', 'Medium', 'Medium'];
  const weights = [74.5, 74.3, 74.4, 74.1, 74.2, 73.9, 73.8];
  
  const dietCalories = [2100, 1850, 2300, 1900, 2400, 1750, 2000];
  const sampleMeals = [
    [
      { id: '1', name: 'Oatmeal & Berries', calories: 350 },
      { id: '2', name: 'Quinoa Bowl with Tofu', calories: 650 },
      { id: '3', name: 'Salmon & Broccoli', calories: 700 },
      { id: '4', name: 'Snacks: Mixed Nuts', calories: 400 }
    ],
    [
      { id: '1', name: 'Avocado Toast', calories: 400 },
      { id: '2', name: 'Lentil Soup', calories: 500 },
      { id: '3', name: 'Baked Chicken Breast with Potatoes', calories: 750 },
      { id: '4', name: 'Snacks: Apple & Almond Butter', calories: 200 }
    ],
    [
      { id: '1', name: 'Sourdough & Jam', calories: 300 },
      { id: '2', name: 'Greens Pasta Salad', calories: 800 },
      { id: '3', name: 'Vegetarian Pizza Slice', calories: 900 },
      { id: '4', name: 'Snacks: dark chocolate', calories: 300 }
    ],
    [
      { id: '1', name: 'Protein Shake & Banana', calories: 350 },
      { id: '2', name: 'Turkey Wrap', calories: 550 },
      { id: '3', name: 'Steak & Asparagus', calories: 800 },
      { id: '4', name: 'Snacks: Rice Cakes', calories: 200 }
    ],
    [
      { id: '1', name: 'Pancakes with Maple Syrup', calories: 600 },
      { id: '2', name: 'Chipotle Chicken Salad Bowl', calories: 800 },
      { id: '3', name: 'Sushi Rolls', calories: 700 },
      { id: '4', name: 'Snacks: Yogurt & Granola', calories: 300 }
    ],
    [
      { id: '1', name: 'Green Smoothie Bowl', calories: 300 },
      { id: '2', name: 'Hummus & Vegetable Sandwich', calories: 450 },
      { id: '3', name: 'Whites and Tofu Scramble', calories: 400 },
      { id: '4', name: 'Snacks: Energy Ball', calories: 600 }
    ],
    [
      { id: '1', name: 'Chia Pudding', calories: 250 },
      { id: '2', name: 'Sweet Potato Burger', calories: 700 },
      { id: '3', name: 'Lemony Garlic Shrimp Pasta', calories: 850 },
      { id: '4', name: 'Snacks: Protein Bar', calories: 200 }
    ]
  ];

  const sampleReflections = [
    'Slept deeply. Energy level is fantastic today! 🚀',
    'Felt slightly anxious in the afternoon, but deep breathing and walk helped. 🌱',
    'Rest Day. Relaxed with some book reading and nutritious salmon meal. 📖',
    'Workout was tough but gym session was highly rewarding. 💧',
    'Slightly sluggish. Need to watch screen time before bedtime.',
    'Focused and productive. Yoga in the evening was very refreshing!',
    'Refreshed and ready for the week ahead! Solid focus.'
  ];

  dates.forEach((date, index) => {
    records[date] = {
      date,
      sleep: {
        hours: sleepHours[index],
        quality: sleepQualities[index],
        sleepTime: sleepTimes[index],
        wakeTime: wakeTimes[index],
      },
      diet: {
        calories: dietCalories[index],
        meals: sampleMeals[index],
      },
      water: {
        totalMl: waterAmounts[index],
        glassSizeMl,
      },
      weight: {
        kg: weights[index],
      },
      exercise: {
        durationMinutes: exerciseMins[index],
        type: exerciseTypes[index],
        intensity: exerciseIntensities[index],
      },
      reflection: sampleReflections[index] || '',
    };
  });

  return records;
}
