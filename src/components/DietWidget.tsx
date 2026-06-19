import { useState, FormEvent, useEffect, useRef } from 'react';
import {
  Flame,
  Plus,
  Trash2,
  TrendingUp,
  Droplet,
  Check,
  Edit3,
  Heart,
  Settings,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { DietRecord, Meal, WaterRecord, DailyRecord, UserSettings } from '../types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { formatDateLabel } from '../utils/date';
import { triggerHaptic } from '../utils/haptic';

interface DietWidgetProps {
  record: DietRecord;
  onChange: (updates: Partial<DietRecord>) => void;
  targetCalories: number;
  pastWeekRecords: DailyRecord[];
  waterRecord: WaterRecord;
  onWaterChange: (updates: Partial<WaterRecord>) => void;
  isDarkMode?: boolean;
  settings: UserSettings;
}

interface FavoriteFood {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sodium: number; // mg
  potassium: number; // mg
  fiber: number; // g
  sugar: number; // g
  referenceGrams?: number; // base weight in grams
}

const DEFAULT_FAVORITE_FOODS: FavoriteFood[] = [
  { id: 'fav-1', name: 'Greek Yogurt & Granola', calories: 280, protein: 18, carbs: 32, fat: 6, sodium: 80, potassium: 240, fiber: 3, sugar: 12, referenceGrams: 100 },
  { id: 'fav-2', name: 'Avocado Toast with Egg', calories: 340, protein: 12, carbs: 24, fat: 18, sodium: 290, potassium: 380, fiber: 6, sugar: 1, referenceGrams: 100 },
  { id: 'fav-3', name: 'Grilled Chicken & Rice', calories: 520, protein: 44, carbs: 48, fat: 8, sodium: 450, potassium: 620, fiber: 4, sugar: 0, referenceGrams: 100 },
  { id: 'fav-4', name: 'Baked Salmon & Broccoli', calories: 450, protein: 38, carbs: 12, fat: 22, sodium: 310, potassium: 680, fiber: 5, sugar: 1, referenceGrams: 100 },
  { id: 'fav-5', name: 'Protein Shake (Whey + Banana)', calories: 310, protein: 28, carbs: 36, fat: 3, sodium: 150, potassium: 510, fiber: 3, sugar: 14, referenceGrams: 100 },
];

export default function DietWidget({
  record,
  onChange,
  targetCalories,
  pastWeekRecords,
  waterRecord,
  onWaterChange,
  isDarkMode = false,
  settings,
}: DietWidgetProps) {
  // Meal Form States
  const [mealName, setMealName] = useState('');
  const [mealCalories, setMealCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [sodium, setSodium] = useState('');
  const [potassium, setPotassium] = useState('');
  const [fiber, setFiber] = useState('');
  const [sugar, setSugar] = useState('');
  const [mealRefGrams, setMealRefGrams] = useState('100');
  const [mealConsumedGrams, setMealConsumedGrams] = useState('100');

  // UI Control states
  const [showAdvancedNutrients, setShowAdvancedNutrients] = useState(false);
  const [editingFavoriteId, setEditingFavoriteId] = useState<string | null>(null);

  // Today's Meal Editing States
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [editMealName, setEditMealName] = useState('');
  const [editMealCalories, setEditMealCalories] = useState('');
  const [editMealProtein, setEditMealProtein] = useState('');
  const [editMealCarbs, setEditMealCarbs] = useState('');
  const [editMealFat, setEditMealFat] = useState('');
  const [editMealSodium, setEditMealSodium] = useState('');
  const [editMealPotassium, setEditMealPotassium] = useState('');
  const [editMealFiber, setEditMealFiber] = useState('');
  const [editMealSugar, setEditMealSugar] = useState('');

  // Favorite Foods list state (persisted in localStorage)
  const [favoriteFoods, setFavoriteFoods] = useState<FavoriteFood[]>(() => {
    const saved = localStorage.getItem('serene_health_favorites');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_FAVORITE_FOODS;
      }
    }
    return DEFAULT_FAVORITE_FOODS;
  });

  // Favorite food creation fields
  const [favName, setFavName] = useState('');
  const [favCalories, setFavCalories] = useState('');
  const [favProtein, setFavProtein] = useState('');
  const [favCarbs, setFavCarbs] = useState('');
  const [favFat, setFavFat] = useState('');
  const [favSodium, setFavSodium] = useState('');
  const [favPotassium, setFavPotassium] = useState('');
  const [favFiber, setFavFiber] = useState('');
  const [favSugar, setFavSugar] = useState('');
  const [favRefGrams, setFavRefGrams] = useState('100');
  const [showAddFavoriteForm, setShowAddFavoriteForm] = useState(false);

  // Portion Logging states for Favorite Foods
  const [favLoggingId, setFavLoggingId] = useState<string | null>(null);
  const [favLoggingGrams, setFavLoggingGrams] = useState<string>('100');

  // Food Suggestions states
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('serene_health_favorites', JSON.stringify(favoriteFoods));
  }, [favoriteFoods]);

  // Aggregate current daily totals
  const totalProtein = record.meals.reduce((sum, m) => sum + (m.protein || 0), 0);
  const totalCarbs = record.meals.reduce((sum, m) => sum + (m.carbs || 0), 0);
  const totalFat = record.meals.reduce((sum, m) => sum + (m.fat || 0), 0);
  const totalSodium = record.meals.reduce((sum, m) => sum + (m.sodium || 0), 0);
  const totalPotassium = record.meals.reduce((sum, m) => sum + (m.potassium || 0), 0);
  const totalFiber = record.meals.reduce((sum, m) => sum + (m.fiber || 0), 0);
  const totalSugar = record.meals.reduce((sum, m) => sum + (m.sugar || 0), 0);

  // Dynamic calculation according to recommended clinical RDA guidelines
  // Protein RDA: 1.2g per kg of body weight (Standard active clinical healthy guideline)
  const TARGET_PROTEIN = Math.max(50, Math.round((settings.targetWeightKg || 70) * 1.2));
  
  // Fat RDA: 25% of total calorie intake (Standard RDA healthy range is 20-35%)
  const TARGET_FAT = Math.max(30, Math.round((settings.targetCalories * 0.25) / 9));
  
  // Carbohydrate RDA: Remaining calories to perfectly match the target calories
  // (RDA recommended range is 45-65% of daily energy intake, this sits beautifully around 50-55%)
  const TARGET_CARBS = Math.max(100, Math.round((settings.targetCalories - (TARGET_PROTEIN * 4 + TARGET_FAT * 9)) / 4));
  
  // Fiber RDA: 14g per 1000 kcal of energy intake (Standard RDA / USDA guidelines)
  const TARGET_FIBER = Math.max(25, Math.round((settings.targetCalories / 1000) * 14));
  
  // Sodium Limit: 2300 mg (Standard Upper Limit recommended by AHA/RDA guidelines)
  const LIMIT_SODIUM = 2300;
  
  // Potassium RDA: 3500 mg (Standard adequate intake/RDA guideline for adults)
  const TARGET_POTASSIUM = 3500;

  // Filter favorite foods for modern dropdown suggestions in Log Food form
  const matchingSuggestions = mealName.trim()
    ? favoriteFoods.filter((fav) =>
        fav.name.toLowerCase().includes(mealName.toLowerCase())
      )
    : [];
  
  // Sugar Limit: WHO/AHA guideline recommends added/free sugars to be <10% of total energy intake
  const LIMIT_SUGAR = Math.max(25, Math.round((settings.targetCalories * 0.10) / 4));

  const handleAddMeal = (e: FormEvent) => {
    e.preventDefault();
    if (!mealName.trim()) return;
    triggerHaptic(20);

    const ref = parseFloat(mealRefGrams) || 100;
    const consumed = parseFloat(mealConsumedGrams) || 100;
    const factor = consumed / ref;

    const finalCals = Math.round((parseInt(mealCalories) || 0) * factor);
    const finalProtein = protein ? parseFloat((parseFloat(protein) * factor).toFixed(1)) : undefined;
    const finalCarbs = carbs ? parseFloat((parseFloat(carbs) * factor).toFixed(1)) : undefined;
    const finalFat = fat ? parseFloat((parseFloat(fat) * factor).toFixed(1)) : undefined;
    const finalSodium = sodium ? parseFloat((parseFloat(sodium) * factor).toFixed(1)) : undefined;
    const finalPotassium = potassium ? parseFloat((parseFloat(potassium) * factor).toFixed(1)) : undefined;
    const finalFiber = fiber ? parseFloat((parseFloat(fiber) * factor).toFixed(1)) : undefined;
    const finalSugar = sugar ? parseFloat((parseFloat(sugar) * factor).toFixed(1)) : undefined;

    const newMeal: Meal = {
      id: Date.now().toString(),
      name: `${mealName.trim()} (${Math.round(consumed)}g)`,
      calories: finalCals,
      protein: finalProtein,
      carbs: finalCarbs,
      fat: finalFat,
      sodium: finalSodium,
      potassium: finalPotassium,
      fiber: finalFiber,
      sugar: finalSugar,
      weightGrams: consumed,
    };

    const updatedMeals = [...record.meals, newMeal];
    const totalCals = updatedMeals.reduce((sum, item) => sum + item.calories, 0);

    onChange({
      meals: updatedMeals,
      calories: totalCals,
    });

    // Reset inputs
    setMealName('');
    setMealCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
    setSodium('');
    setPotassium('');
    setFiber('');
    setSugar('');
    setMealRefGrams('100');
    setMealConsumedGrams('100');
    setShowAdvancedNutrients(false);
  };

  const handleLogFavorite = (fav: FavoriteFood, amt: number) => {
    triggerHaptic(15);
    const ref = fav.referenceGrams || 100;
    const f = amt / ref;

    const newMeal: Meal = {
      id: Date.now().toString(),
      name: `${fav.name} (${Math.round(amt)}g)`,
      calories: Math.round(fav.calories * f),
      protein: fav.protein ? parseFloat((fav.protein * f).toFixed(1)) : undefined,
      carbs: fav.carbs ? parseFloat((fav.carbs * f).toFixed(1)) : undefined,
      fat: fav.fat ? parseFloat((fav.fat * f).toFixed(1)) : undefined,
      sodium: fav.sodium ? parseFloat((fav.sodium * f).toFixed(1)) : undefined,
      potassium: fav.potassium ? parseFloat((fav.potassium * f).toFixed(1)) : undefined,
      fiber: fav.fiber ? parseFloat((fav.fiber * f).toFixed(1)) : undefined,
      sugar: fav.sugar ? parseFloat((fav.sugar * f).toFixed(1)) : undefined,
      weightGrams: amt,
    };

    const updatedMeals = [...record.meals, newMeal];
    const totalCals = updatedMeals.reduce((sum, item) => sum + item.calories, 0);

    onChange({
      meals: updatedMeals,
      calories: totalCals,
    });
  };

  const handleDeleteMeal = (id: string) => {
    const updatedMeals = record.meals.filter((item) => item.id !== id);
    const totalCals = updatedMeals.reduce((sum, item) => sum + item.calories, 0);

    onChange({
      meals: updatedMeals,
      calories: totalCals,
    });
  };

  const startMealEditing = (item: Meal) => {
    setEditingMealId(item.id);
    setEditMealName(item.name);
    setEditMealCalories(String(item.calories));
    setEditMealProtein(item.protein !== undefined ? String(item.protein) : '');
    setEditMealCarbs(item.carbs !== undefined ? String(item.carbs) : '');
    setEditMealFat(item.fat !== undefined ? String(item.fat) : '');
    setEditMealSodium(item.sodium !== undefined ? String(item.sodium) : '');
    setEditMealPotassium(item.potassium !== undefined ? String(item.potassium) : '');
    setEditMealFiber(item.fiber !== undefined ? String(item.fiber) : '');
    setEditMealSugar(item.sugar !== undefined ? String(item.sugar) : '');
  };

  const handleSaveMealEdit = (id: string) => {
    const updatedMeals = record.meals.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          name: editMealName.trim() || item.name,
          calories: parseInt(editMealCalories) || 0,
          protein: editMealProtein ? parseFloat(editMealProtein) : undefined,
          carbs: editMealCarbs ? parseFloat(editMealCarbs) : undefined,
          fat: editMealFat ? parseFloat(editMealFat) : undefined,
          sodium: editMealSodium ? parseFloat(editMealSodium) : undefined,
          potassium: editMealPotassium ? parseFloat(editMealPotassium) : undefined,
          fiber: editMealFiber ? parseFloat(editMealFiber) : undefined,
          sugar: editMealSugar ? parseFloat(editMealSugar) : undefined,
        };
      }
      return item;
    });

    const totalCals = updatedMeals.reduce((sum, item) => sum + item.calories, 0);

    onChange({
      meals: updatedMeals,
      calories: totalCals,
    });
    setEditingMealId(null);
  };

  // Add customized favorite food creator form
  const handleCreateFavorite = (e: FormEvent) => {
    e.preventDefault();
    if (!favName.trim()) return;

    const newFav: FavoriteFood = {
      id: 'custom-' + Date.now().toString(),
      name: favName.trim(),
      calories: parseInt(favCalories) || 0,
      protein: parseFloat(favProtein) || 0,
      carbs: parseFloat(favCarbs) || 0,
      fat: parseFloat(favFat) || 0,
      sodium: parseFloat(favSodium) || 0,
      potassium: parseFloat(favPotassium) || 0,
      fiber: parseFloat(favFiber) || 0,
      sugar: parseFloat(favSugar) || 0,
      referenceGrams: parseInt(favRefGrams) || 100,
    };

    setFavoriteFoods((prev) => [newFav, ...prev]);
    setFavName('');
    setFavCalories('');
    setFavProtein('');
    setFavCarbs('');
    setFavFat('');
    setFavSodium('');
    setFavPotassium('');
    setFavFiber('');
    setFavSugar('');
    setFavRefGrams('100');
    setShowAddFavoriteForm(false);
  };

  // Log water increments
  const handleQuickWaterAdd = (amount: number) => {
    triggerHaptic(15);
    onWaterChange({
      totalMl: Math.max(0, waterRecord.totalMl + amount)
    });
  };

  // Edit inline favorite state modifiers
  const startFavEditing = (fav: FavoriteFood) => {
    setEditingFavoriteId(fav.id);
    setFavName(fav.name);
    setFavCalories(String(fav.calories));
    setFavProtein(String(fav.protein));
    setFavCarbs(String(fav.carbs));
    setFavFat(String(fav.fat));
    setFavSodium(String(fav.sodium));
    setFavPotassium(String(fav.potassium));
    setFavFiber(String(fav.fiber));
    setFavSugar(fav.sugar !== undefined ? String(fav.sugar) : '0');
    setFavRefGrams(String(fav.referenceGrams || 100));
  };

  const handleSaveFavEdit = (id: string) => {
    setFavoriteFoods((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            name: favName,
            calories: parseInt(favCalories) || 0,
            protein: parseFloat(favProtein) || 0,
            carbs: parseFloat(favCarbs) || 0,
            fat: parseFloat(favFat) || 0,
            sodium: parseFloat(favSodium) || 0,
            potassium: parseFloat(favPotassium) || 0,
            fiber: parseFloat(favFiber) || 0,
            sugar: parseFloat(favSugar) || 0,
            referenceGrams: parseInt(favRefGrams) || 100,
          };
        }
        return item;
      })
    );
    setEditingFavoriteId(null);
    setFavName('');
    setFavCalories('');
    setFavProtein('');
    setFavCarbs('');
    setFavFat('');
    setFavSodium('');
    setFavPotassium('');
    setFavFiber('');
    setFavSugar('');
    setFavRefGrams('100');
  };

  const handleDeleteFavorite = (id: string) => {
    setFavoriteFoods((prev) => prev.filter((item) => item.id !== id));
    if (editingFavoriteId === id) setEditingFavoriteId(null);
  };

  // Calorie calculation percentages
  const calPercentage = Math.min(Math.round((record.calories / targetCalories) * 100), 100);

  // Format Recharts data for Caloric Intake past 7 days
  const chartData = pastWeekRecords.map((r) => {
    const label = formatDateLabel(r.date);
    return {
      dateLabel: label.split(',')[0], // Wed, Thu...
      calories: r.diet.calories,
    };
  });

  const gridLineColor = isDarkMode ? '#1e293b' : '#f1f5f9';
  const labelColor = isDarkMode ? '#94a3b8' : '#64748b';

  return (
    <div id="diet-tab-view" className="space-y-6">
      
      {/* Caloric Tracker with macros/micros */}
      <div className="bg-white/75 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/85 p-5 rounded-3xl shadow-subtle dark:shadow-none space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-mono tracking-widest text-rose-500 font-extrabold flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-rose-500" />
            Nutritional Footprint
          </span>
          <span className="text-sm font-sans font-bold text-slate-800 dark:text-slate-100">
            {record.calories} kcal
          </span>
        </div>

        {/* Large Goal Meter */}
        <div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden ring-1 ring-slate-100 dark:ring-slate-800">
            <div
              id="caloric-indicator"
              className="bg-gradient-to-r from-rose-400 to-pink-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${calPercentage}%` }}
            />
          </div>
          <div className="flex justify-end text-[10px] text-slate-400 dark:text-slate-500 mt-1 uppercase font-mono tracking-tight">
            <span>
              {targetCalories - record.calories > 0
                ? `${targetCalories - record.calories} kcal remaining`
                : 'Daily target fulfilled'}
            </span>
          </div>
        </div>

        {/* 7-Column Vertical Nutrient Balance Grid */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60">
          <div className="flex flex-col gap-0.5 mb-3">
            <span className="text-[10px] uppercase font-mono font-bold text-slate-400 dark:text-slate-500 tracking-wider block">
              RDA Balanced Nutrient Intake
            </span>
          </div>
          <div className="grid grid-cols-7 gap-1 sm:gap-2.5">
            {[
              { name: 'Protein', unit: 'g', total: totalProtein, target: TARGET_PROTEIN, barColorClass: 'bg-indigo-500 dark:bg-indigo-400' },
              { name: 'Carbs', unit: 'g', total: totalCarbs, target: TARGET_CARBS, barColorClass: 'bg-amber-500 dark:bg-amber-400' },
              { name: 'Fat', unit: 'g', total: totalFat, target: TARGET_FAT, barColorClass: 'bg-rose-500 dark:bg-rose-455' },
              { name: 'Fiber', unit: 'g', total: totalFiber, target: TARGET_FIBER, barColorClass: 'bg-emerald-500 dark:bg-emerald-400' },
              { name: 'Sodium', unit: 'mg', total: totalSodium, target: LIMIT_SODIUM, barColorClass: 'bg-slate-405 dark:bg-slate-500' },
              { name: 'Potassium', unit: 'mg', total: totalPotassium, target: TARGET_POTASSIUM, barColorClass: 'bg-violet-500 dark:bg-violet-400' },
              { name: 'Sugar', unit: 'g', total: totalSugar, target: LIMIT_SUGAR, barColorClass: 'bg-red-500' },
            ].map((n) => {
              const total = n.total;
              const target = n.target;
              const isOverflow = total > target;
              
              // percentage calculated according to spec
              const pct = target > 0 ? (total / target) * 100 : 0;
              const shadedPct = isOverflow ? 100 : pct;
              const targetLinePos = isOverflow && total > 0 ? (target / total) * 100 : null;

              return (
                <div key={n.name} className="flex flex-col items-center flex-1 min-w-0" id={`nutrient-bar-${n.name.toLowerCase()}`}>
                  
                  {/* Value label */}
                  <div className="text-center font-sans">
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-100 block truncate leading-tight">
                      {total}
                    </span>
                    <span className="text-[8px] font-mono text-slate-400 dark:text-slate-500 block -mt-0.5">
                      {n.unit}
                    </span>
                  </div>

                  {/* Vertical Bar Container */}
                  <div className="h-28 sm:h-36 w-3 sm:w-5.5 bg-slate-100 dark:bg-slate-800/70 rounded-md sm:rounded-lg relative overflow-hidden my-2 border border-slate-200 dark:border-slate-800/80 flex flex-col justify-end">
                    {/* Shaded Consumed Area */}
                    <div
                      className={`${n.barColorClass} transition-all duration-500`}
                      style={{
                        height: `${Math.max(0, Math.min(100, shadedPct))}%`,
                      }}
                    />

                    {/* Absolute target line if user consumed more than target */}
                    {targetLinePos !== null && (
                      <div
                        className="absolute left-0 right-0 border-t-2 border-amber-500 dark:border-amber-400 z-10 shadow-xs"
                        style={{ bottom: `${targetLinePos}%` }}
                        title={`Target: ${target}${n.unit}`}
                      />
                    )}
                  </div>

                  {/* Bottom Labeling */}
                  <span className="text-[9px] uppercase font-mono font-bold tracking-tight text-slate-500 dark:text-slate-400 block truncate max-w-full">
                    {n.name}
                  </span>
                  <span className="text-[8px] font-mono text-slate-400 dark:text-slate-500 block truncate max-w-full">
                    ({target})
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Hydration with PLUS sign widget */}
      <div className="bg-white/75 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/85 p-5 rounded-3xl shadow-subtle dark:shadow-none space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-mono tracking-widest text-sky-500 font-extrabold flex items-center gap-1.5">
            <Droplet className="w-4 h-4 text-sky-500" />
            Hydration Logs
          </span>
          <span className="text-sm font-sans font-bold text-slate-800 dark:text-slate-100">
            {waterRecord.totalMl} ml
          </span>
        </div>

        <div className="space-y-1">
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3.5 relative overflow-hidden ring-1 ring-slate-100 dark:ring-slate-800">
            <div
              className="bg-gradient-to-r from-sky-400 to-sky-500 h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.min((waterRecord.totalMl / 2000) * 100, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono">
            <span>Goal: 2000 ml</span>
            <span className="font-semibold text-sky-500 dark:text-sky-400">
              {Math.round((waterRecord.totalMl / 2000) * 100)}%
            </span>
          </div>
        </div>

        {/* Inline Hydration Plus additions */}
        <div>
          <span className="text-[9px] uppercase font-mono tracking-wider text-slate-400 dark:text-slate-500 block mb-2 font-bold">
            Tap to add water intake:
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              id="food-water-add-250"
              type="button"
              onClick={() => handleQuickWaterAdd(250)}
              className="w-full py-2.5 px-3 border border-sky-100 dark:border-sky-950 bg-sky-50/50 hover:bg-sky-100/80 dark:bg-sky-950/20 dark:hover:bg-sky-950/55 text-sky-600 dark:text-sky-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5 flex-shrink-0" />
              <span>+250 ml</span>
            </button>
            <button
              id="food-water-add-500"
              type="button"
              onClick={() => handleQuickWaterAdd(500)}
              className="w-full py-2.5 px-3 border border-sky-100 dark:border-sky-950 bg-sky-50/55 hover:bg-sky-100/80 dark:bg-sky-950/20 dark:hover:bg-sky-950/55 text-sky-600 dark:text-sky-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5 flex-shrink-0" />
              <span>+500 ml</span>
            </button>
            <button
              id="food-water-subtract-250"
              type="button"
              onClick={() => handleQuickWaterAdd(-250)}
              className="w-full py-2.5 px-3 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition"
              title="Subtract 250ml"
            >
              <span>-250 ml</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Interactive meal logging form with optional macronutrient and micronutrient inputs */}
      <div className="bg-white/75 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/85 p-5 rounded-3xl shadow-subtle dark:shadow-none space-y-4">
        <h3 className="text-sm font-sans font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Flame className="w-4.5 h-4.5 text-rose-500" />
          Log Food & Nutrients
        </h3>

        <form onSubmit={handleAddMeal} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 relative" ref={suggestionRef}>
              <label className="text-[10px] text-slate-400 dark:text-slate-500 uppercase block mb-1 font-mono font-bold">Meal/Snack Description</label>
              <input
                id="meal-name"
                type="text"
                placeholder="Avocado Salmon Sourdough"
                value={mealName}
                onFocus={() => setShowSuggestions(true)}
                onChange={(e) => {
                  setMealName(e.target.value);
                  setShowSuggestions(true);
                }}
                className="w-full px-3 py-2 text-xs bg-slate-50/60 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-300 focus:border-rose-500 text-slate-800 dark:text-slate-100"
                autoComplete="off"
              />

              {/* Modern Custom Suggestions Dropdown */}
              {showSuggestions && matchingSuggestions.length > 0 && (
                <div 
                  id="meal-autofill-suggestions"
                  className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 space-y-0.5 animate-in fade-in slide-in-from-top-2 duration-150"
                >
                  <div className="flex items-center justify-between px-2.5 py-1 text-[9px] uppercase font-mono font-bold text-slate-450 border-b border-slate-100 dark:border-slate-800/50 pb-1.5 mb-1.5">
                    <span>Autofill Favorites</span>
                    <span className="bg-rose-500/10 text-rose-500 dark:text-rose-450 px-1.5 py-0.5 rounded-full text-[8px] font-mono leading-none">
                      {matchingSuggestions.length} found
                    </span>
                  </div>

                  {matchingSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      type="button"
                      onClick={() => {
                        triggerHaptic(12);
                        setMealName(suggestion.name);
                        setMealCalories(String(suggestion.calories));
                        setProtein(suggestion.protein !== undefined ? String(suggestion.protein) : '');
                        setCarbs(suggestion.carbs !== undefined ? String(suggestion.carbs) : '');
                        setFat(suggestion.fat !== undefined ? String(suggestion.fat) : '');
                        setSodium(suggestion.sodium !== undefined ? String(suggestion.sodium) : '');
                        setPotassium(suggestion.potassium !== undefined ? String(suggestion.potassium) : '');
                        setFiber(suggestion.fiber !== undefined ? String(suggestion.fiber) : '');
                        setSugar(suggestion.sugar !== undefined ? String(suggestion.sugar) : '');
                        setMealRefGrams(String(suggestion.referenceGrams || 100));
                        setMealConsumedGrams(String(suggestion.referenceGrams || 100));
                        setShowSuggestions(false);
                      }}
                      className="w-full text-left px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/45 rounded-xl transition-all block group space-y-1.5"
                    >
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block group-hover:text-rose-500 transition-colors truncate">
                        {suggestion.name}
                      </span>

                      <div className="flex items-center justify-between gap-2">
                        {/* Column 1: Energy & Base */}
                        <div className="flex gap-2 text-[10px] font-mono text-slate-400 dark:text-slate-500">
                          <span className="font-semibold text-slate-600 dark:text-slate-400">{suggestion.calories} kcal</span>
                          <span>•</span>
                          <span>{suggestion.referenceGrams || 100}g base</span>
                        </div>

                        {/* Column 2: Nutrients */}
                        <div className="flex gap-1.5 text-[9px] font-mono text-slate-450 dark:text-slate-500 bg-slate-100/60 dark:bg-slate-800/35 px-2 py-0.5 rounded-lg group-hover:bg-rose-500/10 group-hover:text-rose-500 dark:group-hover:text-rose-450 transition-all">
                          <span>P:{suggestion.protein || 0}g</span>
                          <span>C:{suggestion.carbs || 0}g</span>
                          <span>F:{suggestion.fat || 0}g</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="text-[10px] text-slate-400 dark:text-slate-500 uppercase block mb-1 font-mono font-bold">Energy (kcal)</label>
              <input
                id="meal-calories"
                type="number"
                inputMode="numeric"
                placeholder="420"
                value={mealCalories}
                onChange={(e) => setMealCalories(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50/60 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-300 focus:border-rose-500 text-slate-800 dark:text-slate-100 font-mono"
              />
            </div>
          </div>

          {/* Grams and Portion controls inside form */}
          <div className="grid grid-cols-2 gap-3 bg-rose-50/25 dark:bg-rose-950/10 border border-rose-100/50 dark:border-rose-900/30 p-3 rounded-2xl">
            <div>
              <label className="text-[10px] text-rose-600 dark:text-rose-400 uppercase block mb-1 font-mono font-bold">Reference Weight (g)</label>
              <input
                id="meal-ref-grams"
                type="number"
                inputMode="numeric"
                placeholder="100"
                value={mealRefGrams}
                onChange={(e) => setMealRefGrams(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-850 dark:text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-rose-600 dark:text-rose-400 uppercase block mb-1 font-mono font-bold">Grams Consumed (g)</label>
              <input
                id="meal-consumed-grams"
                type="number"
                inputMode="numeric"
                placeholder="100"
                value={mealConsumedGrams}
                onChange={(e) => setMealConsumedGrams(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-850 dark:text-slate-100 font-mono"
              />
            </div>
          </div>

          {/* Toggle for Macros and Micros */}
          <button
            id="toggle-nutrients"
            type="button"
            onClick={() => setShowAdvancedNutrients(!showAdvancedNutrients)}
            className="flex items-center gap-1 text-xs text-indigo-500 dark:text-indigo-400 font-semibold hover:underline"
          >
            <span>{showAdvancedNutrients ? 'Hide' : 'Add'} Macro & Micro Nutrients</span>
            {showAdvancedNutrients ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showAdvancedNutrients && (
            <div className="grid grid-cols-4 gap-1 pb-4 px-4 pt-1 bg-slate-50/40 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/60 rounded-2xl animate-in fade-in duration-200">
              <div className="flex flex-col justify-end">
                <label className="text-[9px] text-slate-400 dark:text-slate-500 uppercase flex items-end h-8 mb-1 font-mono font-semibold">Protein (g)</label>
                <input
                   type="number"
                   inputMode="decimal"
                   step="0.1"
                   placeholder="24"
                   value={protein}
                   onChange={(e) => setProtein(e.target.value)}
                   className="w-full p-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 font-mono"
                />
              </div>
              <div className="flex flex-col justify-end">
                <label className="text-[9px] text-slate-400 dark:text-slate-500 uppercase flex items-end h-8 mb-1 font-mono font-semibold">Carbs (g)</label>
                <input
                   type="number"
                   inputMode="decimal"
                   step="0.1"
                   placeholder="45"
                   value={carbs}
                   onChange={(e) => setCarbs(e.target.value)}
                   className="w-full p-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 font-mono"
                />
              </div>
              <div className="flex flex-col justify-end">
                <label className="text-[9px] text-slate-400 dark:text-slate-500 uppercase flex items-end h-8 mb-1 font-mono font-semibold">Fat (g)</label>
                <input
                   type="number"
                   inputMode="decimal"
                   step="0.1"
                   placeholder="12"
                   value={fat}
                   onChange={(e) => setFat(e.target.value)}
                   className="w-full p-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 font-mono"
                />
              </div>
              <div className="flex flex-col justify-end">
                <label className="text-[9px] text-slate-400 dark:text-slate-500 uppercase flex items-end h-8 mb-1 font-mono font-semibold">Sugar (g)</label>
                <input
                   type="number"
                   inputMode="decimal"
                   step="0.1"
                   placeholder="5"
                   value={sugar}
                   onChange={(e) => setSugar(e.target.value)}
                   className="w-full p-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 font-mono"
                />
              </div>
              <div className="flex flex-col justify-end">
                <label className="text-[9px] text-slate-400 dark:text-slate-500 uppercase flex items-end h-8 mb-1 font-mono font-semibold">Fiber (g)</label>
                <input
                   type="number"
                   inputMode="decimal"
                   step="0.1"
                   placeholder="6.5"
                   value={fiber}
                   onChange={(e) => setFiber(e.target.value)}
                   className="w-full p-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 font-mono"
                />
              </div>
              <div className="flex flex-col justify-end">
                <label className="text-[9px] text-slate-400 dark:text-slate-500 uppercase flex items-end h-8 mb-1 font-mono font-semibold">Na (mg)</label>
                <input
                   type="number"
                   inputMode="numeric"
                   placeholder="340"
                   value={sodium}
                   onChange={(e) => setSodium(e.target.value)}
                   className="w-full p-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 font-mono"
                />
              </div>
              <div className="flex flex-col justify-end">
                <label className="text-[9px] text-slate-400 dark:text-slate-500 uppercase flex items-end h-8 mb-1 font-mono font-semibold">K (mg)</label>
                <input
                   type="number"
                   inputMode="numeric"
                   placeholder="420"
                   value={potassium}
                   onChange={(e) => setPotassium(e.target.value)}
                   className="w-full p-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 font-mono"
                />
              </div>
            </div>
          )}

          <button
            id="submit-meal-btn"
            type="submit"
            className="w-full py-2 bg-rose-500 hover:bg-rose-600 block text-xs font-semibold text-white rounded-xl transition shadow-md shadow-rose-500/10 flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add to Today's Logs</span>
          </button>
        </form>

        {/* List of active today's items */}
        {record.meals.length > 0 && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 dark:text-slate-500 block">Logged meals today</span>
            <div className="max-h-[30vh] overflow-y-auto space-y-2 pr-1">
              {record.meals.map((item) => {
                const isEditing = editingMealId === item.id;
                return (
                  <div
                    key={item.id}
                    className="flex flex-col gap-2 p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl hover:border-slate-200 dark:hover:border-slate-700 transition"
                  >
                    {isEditing ? (
                       <div className="space-y-2.5">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                           <div className="sm:col-span-2">
                            <span className="text-[9px] uppercase font-mono text-slate-400 dark:text-slate-500 block font-bold">Meal Name</span>
                            <input
                              type="text"
                              className="w-full px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-100"
                              value={editMealName}
                              onChange={(e) => setEditMealName(e.target.value)}
                            />
                          </div>
                          <div>
                            <span className="text-[9px] uppercase font-mono text-slate-400 dark:text-slate-500 block font-bold">Energy (kcal)</span>
                            <input
                              type="number"
                              inputMode="numeric"
                              className="w-full px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-100 font-mono"
                              value={editMealCalories}
                              onChange={(e) => setEditMealCalories(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-[10px]">
                          <div>
                            <span className="text-[8px] uppercase font-mono text-slate-400 dark:text-slate-500 block font-bold">Protein (g)</span>
                            <input
                              type="number"
                              inputMode="decimal"
                              step="0.1"
                              className="w-full p-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded"
                              value={editMealProtein}
                              onChange={(e) => setEditMealProtein(e.target.value)}
                            />
                          </div>
                          <div>
                            <span className="text-[8px] uppercase font-mono text-slate-400 dark:text-slate-500 block font-bold">Carbs (g)</span>
                            <input
                              type="number"
                              inputMode="decimal"
                              step="0.1"
                              className="w-full p-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded"
                              value={editMealCarbs}
                              onChange={(e) => setEditMealCarbs(e.target.value)}
                            />
                          </div>
                          <div>
                            <span className="text-[8px] uppercase font-mono text-slate-400 dark:text-slate-500 block font-bold">Fat (g)</span>
                            <input
                              type="number"
                              inputMode="decimal"
                              step="0.1"
                              className="w-full p-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded"
                              value={editMealFat}
                              onChange={(e) => setEditMealFat(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-2 text-[10px]">
                          <div>
                            <span className="text-[8px] uppercase font-mono text-slate-400 dark:text-slate-500 block font-bold">Sugar (g)</span>
                            <input
                              type="number"
                              inputMode="decimal"
                              step="0.1"
                              className="w-full p-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded"
                              placeholder="Opt"
                              value={editMealSugar}
                              onChange={(e) => setEditMealSugar(e.target.value)}
                            />
                          </div>
                          <div>
                            <span className="text-[8px] uppercase font-mono text-slate-400 dark:text-slate-500 block font-bold">Fiber (g)</span>
                            <input
                              type="number"
                              inputMode="decimal"
                              step="0.1"
                              className="w-full p-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded"
                              placeholder="Opt"
                              value={editMealFiber}
                              onChange={(e) => setEditMealFiber(e.target.value)}
                            />
                          </div>
                          <div>
                            <span className="text-[8px] uppercase font-mono text-slate-400 dark:text-slate-500 block font-bold">Na (mg)</span>
                            <input
                              type="number"
                              inputMode="numeric"
                              className="w-full p-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded"
                              placeholder="Opt"
                              value={editMealSodium}
                              onChange={(e) => setEditMealSodium(e.target.value)}
                            />
                          </div>
                          <div>
                            <span className="text-[8px] uppercase font-mono text-slate-400 dark:text-slate-500 block font-bold">K (mg)</span>
                            <input
                              type="number"
                              inputMode="numeric"
                              className="w-full p-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded"
                              placeholder="Opt"
                              value={editMealPotassium}
                              onChange={(e) => setEditMealPotassium(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 pt-3 px-1 border-t border-slate-200 dark:border-slate-800/40">
                          <button
                            type="button"
                            onClick={() => handleSaveMealEdit(item.id)}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-3 py-1.5 text-[10px] rounded-lg transition"
                          >
                            Save Changes
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingMealId(null)}
                            className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1.5 text-[10px] rounded-lg transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex flex-col gap-0.5 max-w-[80%]">
                          <span className="font-sans font-semibold text-slate-800 dark:text-slate-200 truncate">{item.name}</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                            {item.calories} kcal
                            {item.protein !== undefined && ` • ${item.protein}g P`}
                            {item.carbs !== undefined && ` • ${item.carbs}g C`}
                            {item.fat !== undefined && ` • ${item.fat}g F`}
                            {item.sugar !== undefined && ` • ${item.sugar}g Sugar`}
                            {item.sodium !== undefined && ` • ${item.sodium}mg Na`}
                            {item.potassium !== undefined && ` • ${item.potassium}mg K`}
                            {item.fiber !== undefined && ` • ${item.fiber}g F`}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            id={`edit-logged-${item.id}`}
                            type="button"
                            onClick={() => startMealEditing(item)}
                            className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition"
                            title="Edit meal records"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            id={`delete-logged-${item.id}`}
                            type="button"
                            onClick={() => handleDeleteMeal(item.id)}
                            className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition"
                            title="Remove meal log"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 3. Frequently Eaten & Favorite Foods Library */}
      <div className="bg-white/75 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/85 p-5 rounded-3xl shadow-subtle dark:shadow-none space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-sans font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Heart className="w-4.5 h-4.5 text-rose-500 fill-rose-100 dark:fill-rose-950/20" />
            Favorite Foods
          </h3>
          <button
            id="toggle-add-favorite-form"
            type="button"
            onClick={() => setShowAddFavoriteForm(!showAddFavoriteForm)}
            className="text-xs text-indigo-500 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1"
          >
            {showAddFavoriteForm ? 'Close Editor' : '+ Add Favorite Item'}
          </button>
        </div>

        {/* Favorite Creator form */}
        {showAddFavoriteForm && (
          <form onSubmit={handleCreateFavorite} className="pb-4 px-4 pt-1 bg-slate-50/50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase block">Create New Food Card</span>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <div className="sm:col-span-2">
                <span className="text-[8px] text-slate-400 block font-mono">Name</span>
                <input
                  type="text"
                  placeholder="Food Name"
                  value={favName}
                  onChange={(e) => setFavName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <span className="text-[8px] text-slate-400 block font-mono">Base(g)</span>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="Base Weight (g)"
                  value={favRefGrams}
                  onChange={(e) => setFavRefGrams(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 font-mono"
                />
              </div>
              <div>
                <span className="text-[8px] text-slate-400 block font-mono">kcal</span>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="Energy (kcal)"
                  value={favCalories}
                  onChange={(e) => setFavCalories(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 font-mono"
                />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-[8px] text-slate-400 block font-mono">Pro(g)</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  placeholder="Protein g"
                  value={favProtein}
                  onChange={(e) => setFavProtein(e.target.value)}
                  className="w-full p-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <span className="text-[8px] text-slate-400 block font-mono">Carbs(g)</span>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Carbs g"
                  value={favCarbs}
                  onChange={(e) => setFavCarbs(e.target.value)}
                  className="w-full p-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <span className="text-[8px] text-slate-400 block font-mono">Fat(g)</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  placeholder="Fat g"
                  value={favFat}
                  onChange={(e) => setFavFat(e.target.value)}
                  className="w-full p-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <span className="text-[8px] text-slate-400 block font-mono">Sugar(g)</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  placeholder="Sugar g"
                  value={favSugar}
                  onChange={(e) => setFavSugar(e.target.value)}
                  className="w-full p-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <span className="text-[8px] text-slate-400 block font-mono">Fiber(g)</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  placeholder="Fiber g"
                  value={favFiber}
                  onChange={(e) => setFavFiber(e.target.value)}
                  className="w-full p-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <span className="text-[8px] text-slate-400 block font-mono">Na(mg)</span>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="Na mg"
                  value={favSodium}
                  onChange={(e) => setFavSodium(e.target.value)}
                  className="w-full p-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <span className="text-[8px] text-slate-400 block font-mono">K(mg)</span>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="K mg"
                  value={favPotassium}
                  onChange={(e) => setFavPotassium(e.target.value)}
                  className="w-full p-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
            <button
              id="submit-favorite-creation-btn"
              type="submit"
              className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold block transition"
            >
              Save to Favorites
            </button>
          </form>
        )}

        {/* Favorite Food List / Grid matching design guidelines */}
        <div className="grid grid-cols-1 gap-3 max-h-[50vh] overflow-y-auto pr-1">
          {favoriteFoods.map((fav) => {
            const isEditing = editingFavoriteId === fav.id;
            const isLogging = favLoggingId === fav.id;

            return (
              <div
                id={`favorite-food-${fav.id}`}
                key={fav.id}
                className="p-3 border border-slate-100 dark:border-slate-800 bg-slate-50/55 dark:bg-slate-900/40 rounded-2xl flex flex-col justify-between gap-2.5 transition group hover:border-slate-200 dark:hover:border-slate-700"
              >
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-slate-700 dark:text-slate-200"
                      value={favName}
                      onChange={(e) => setFavName(e.target.value)}
                    />
                    <div className="grid grid-cols-5 gap-1 text-[10px]">
                      <div>
                        <span className="text-[8px] text-slate-400 block font-mono">Base(g)</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          className="w-full p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-center"
                          value={favRefGrams}
                          onChange={(e) => setFavRefGrams(e.target.value)}
                        />
                      </div>
                      <div>
                        <span className="text-[8px] text-slate-400 block font-mono">kcal</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          className="w-full p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-center"
                          value={favCalories}
                          onChange={(e) => setFavCalories(e.target.value)}
                        />
                      </div>
                      <div>
                        <span className="text-[8px] text-slate-400 block font-mono">Pro(g)</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          className="w-full p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-center"
                          value={favProtein}
                          onChange={(e) => setFavProtein(e.target.value)}
                        />
                      </div>
                      <div>
                        <span className="text-[8px] text-slate-400 block font-mono">Carb(g)</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          className="w-full p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-center"
                          value={favCarbs}
                          onChange={(e) => setFavCarbs(e.target.value)}
                        />
                      </div>
                      <div>
                        <span className="text-[8px] text-slate-400 block font-mono">Fat(g)</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          className="w-full p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-center"
                          value={favFat}
                          onChange={(e) => setFavFat(e.target.value)}
                        />
                      </div>
                    </div>
                    {/* micro edit inline */}
                    <div className="grid grid-cols-4 gap-1 text-[9px] text-slate-400 mt-1">
                      <div>
                        <span className="text-[8px] text-slate-400 block font-mono">Sugar(g)</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          placeholder="Sugar g"
                          className="w-full p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded"
                          value={favSugar}
                          onChange={(e) => setFavSugar(e.target.value)}
                        />
                      </div>
                      <div>
                        <span className="text-[8px] text-slate-400 block font-mono">Fiber(g)</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          placeholder="Fiber g"
                          className="w-full p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded"
                          value={favFiber}
                          onChange={(e) => setFavFiber(e.target.value)}
                        />
                      </div>
                      <div>
                        <span className="text-[8px] text-slate-400 block font-mono">Na(mg)</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          placeholder="Na mg"
                          className="w-full p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded"
                          value={favSodium}
                          onChange={(e) => setFavSodium(e.target.value)}
                        />
                      </div>
                      <div>
                        <span className="text-[8px] text-slate-400 block font-mono">K(mg)</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          placeholder="K mg"
                          className="w-full p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded"
                          value={favPotassium}
                          onChange={(e) => setFavPotassium(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => handleSaveFavEdit(fav.id)}
                        className="text-[10px] bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-2 py-1 rounded"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingFavoriteId(null)}
                        className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : isLogging ? (
                  /* Interactive Portion Logging Inline Form panel */
                  <div className="space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] uppercase font-mono font-bold text-rose-500">Log Portioned Weight</span>
                      <button
                        type="button"
                        onClick={() => setFavLoggingId(null)}
                        className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="border border-indigo-150 bg-indigo-50/20 dark:border-indigo-950/40 dark:bg-indigo-950/10 p-2.5 rounded-xl space-y-1">
                      <span className="text-[10px] font-medium text-slate-800 dark:text-slate-200 block truncate">{fav.name}</span>
                      <span className="text-[9px] text-slate-400 block font-mono">Reference serving size: {fav.referenceGrams || 100}g</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">Weight Consumed:</span>
                      <input
                        type="number"
                        className="w-full px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 font-mono focus:ring-1 focus:ring-rose-400 focus:border-rose-500"
                        value={favLoggingGrams}
                        onChange={(e) => setFavLoggingGrams(e.target.value)}
                        placeholder={String(fav.referenceGrams || 100)}
                      />
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">g</span>
                    </div>

                    {/* Highly tailored real-time scaled nutrient calculator display */}
                    {(() => {
                      const grams = parseFloat(favLoggingGrams) || 0;
                      const ref = fav.referenceGrams || 100;
                      const factor = grams / ref;
                      const cals = Math.round(fav.calories * factor);
                      const proteing = fav.protein ? (fav.protein * factor).toFixed(1) : '0';
                      const carb_g = fav.carbs ? (fav.carbs * factor).toFixed(1) : '0';
                      const fatg = fav.fat ? (fav.fat * factor).toFixed(1) : '0';
                      return (
                        <div className="text-[9px] font-mono text-slate-400 dark:text-slate-500 bg-slate-100/40 dark:bg-slate-800/25 px-2.5 py-1.5 rounded-lg flex justify-between">
                          <span>Scaled: {cals} kcal</span>
                          <span>P: {proteing}g</span>
                          <span>C: {carb_g}g</span>
                          <span>F: {fatg}g</span>
                        </div>
                      );
                    })()}

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const amt = parseFloat(favLoggingGrams) || (fav.referenceGrams || 100);
                          handleLogFavorite(fav, amt);
                          setFavLoggingId(null);
                        }}
                        className="flex-1 py-1.5 bg-rose-500 hover:bg-rose-600 block text-xs font-semibold text-white rounded-xl transition shadow-md shadow-rose-500/10 text-center"
                      >
                        Confirm Portion Log
                      </button>
                      <button
                        type="button"
                        onClick={() => setFavLoggingId(null)}
                        className="py-1.5 px-3 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-medium rounded-xl transition"
                      >
                        Back
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center gap-4">
                      {/* Name and nutrient indicators on the left */}
                      <div className="flex-1 min-w-0 pr-1">
                        <h4 className="font-sans font-bold text-slate-700 dark:text-slate-200 text-xs truncate">
                          {fav.name}
                        </h4>
                        <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 mt-1 inline-block bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 dark:text-indigo-400 border border-indigo-100/40 dark:border-indigo-900/30 rounded">
                          {fav.referenceGrams || 100}g reference serving
                        </span>

                        <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 space-y-0.5 mt-2.5 border-l-2 border-indigo-100/50 dark:border-indigo-950/40 pl-2">
                          <div>Energy: {fav.calories} kcal</div>
                          {fav.protein !== undefined && <div>Protein: {fav.protein}g</div>}
                          {fav.carbs !== undefined && <div>Carbs: {fav.carbs}g</div>}
                          {fav.fat !== undefined && <div>Fat: {fav.fat}g</div>}
                          {fav.sugar !== undefined && fav.sugar !== 0 && <div>Sugar: {fav.sugar}g</div>}
                          {fav.fiber !== undefined && fav.fiber !== 0 && <div>Fiber: {fav.fiber}g</div>}
                          {fav.sodium !== undefined && fav.sodium !== 0 && <div>Sodium: {fav.sodium}mg</div>}
                          {fav.potassium !== undefined && fav.potassium !== 0 && <div>Potassium: {fav.potassium}mg</div>}
                        </div>
                      </div>

                      {/* Stacking the Actions Vertically on the Right */}
                      <div className="flex flex-col gap-6 items-center flex-shrink-0 bg-slate-100/50 dark:bg-slate-800/10 p-2 rounded-xl border border-slate-100 dark:border-slate-800/35">
                        {/* Instant portions add trigger */}
                        <button
                          id={`add-favorite-instantly-${fav.id}`}
                          type="button"
                          onClick={() => {
                            setFavLoggingId(fav.id);
                            setFavLoggingGrams(String(fav.referenceGrams || 100));
                          }}
                          title="Log portion of favorite"
                          className="p-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        
                        {/* Edit card details trigger */}
                        <button
                          id={`edit-favorite-${fav.id}`}
                          type="button"
                          onClick={() => startFavEditing(fav)}
                          title="Edit base food card parameters"
                          className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        
                        {/* Delete trigger */}
                        <button
                          id={`delete-favorite-${fav.id}`}
                          type="button"
                          onClick={() => handleDeleteFavorite(fav.id)}
                          title="Delete favorite card"
                          className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Graph of Daily Calories Intake */}
      <div className="bg-white/75 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/85 p-5 rounded-3xl shadow-subtle dark:shadow-none space-y-4">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 dark:text-slate-500 font-bold block">
            Weekly Performance
          </span>
          <h3 className="text-sm font-sans font-bold text-slate-800 dark:text-slate-100 mt-0.5 flex items-center gap-2">
            <TrendingUp className="w-4.5 h-4.5 text-indigo-500" />
            7-Day Calories Trend vs Goal
          </h3>
        </div>

        <div className="h-56 w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridLineColor} vertical={false} />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 9, fill: labelColor }} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: labelColor }} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: isDarkMode ? '#1e293b' : '#ffffff',
                  border: isDarkMode ? '1px solid #334155' : '1px solid #f1f5f9',
                  borderRadius: '16px',
                  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.05)',
                }}
                labelStyle={{ fontWeight: 600, fontSize: '11px', color: isDarkMode ? '#f8fafc' : '#1e293b' }}
                itemStyle={{ fontSize: '10px' }}
              />
              <ReferenceLine y={targetCalories} stroke="#f43f5e" strokeDasharray="3 3" strokeWidth={1.5} label={{ value: 'Target', position: 'insideTopRight', fill: '#f43f5e', fontSize: 9, fontWeight: 600 }} />
              <Bar dataKey="calories" name="Consumed Calories" fill="#fb7185" radius={[4, 4, 0, 0]} barSize={26} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
