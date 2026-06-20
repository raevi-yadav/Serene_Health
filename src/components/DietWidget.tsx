import { useState, FormEvent, useEffect, useRef, ChangeEvent } from 'react';
import Tesseract from 'tesseract.js';
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
  Sparkles,
  AlertCircle,
  Loader2,
  Scan,
  Camera,
  Image,
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
  const [editMealWeightGrams, setEditMealWeightGrams] = useState('');
  const [baselineMeal, setBaselineMeal] = useState<Meal | null>(null);

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

  // Scanner UI options
  const [showScanOptions, setShowScanOptions] = useState(false);
  const [showAddMealModal, setShowAddMealModal] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Portion Logging states for Favorite Foods
  const [favLoggingId, setFavLoggingId] = useState<string | null>(null);
  const [favLoggingGrams, setFavLoggingGrams] = useState<string>('100');
  const [confirmDeleteFavId, setConfirmDeleteFavId] = useState<string | null>(null);
  const [confirmDeleteMealId, setConfirmDeleteMealId] = useState<string | null>(null);

  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  // OCR state variables
  const [ocrScanning, setOcrScanning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<number | null>(null);
  const [ocrMode, setOcrMode] = useState<'local' | 'gemini'>('local');
  const [lastUploadedFile, setLastUploadedFile] = useState<{ base64: string; mimeType: string } | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<{
    name: string;
    servingSizeGrams: number;
    energyKcal: number;
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
    sodiumMg: number;
    potassiumMg: number;
    fiberGrams: number;
    sugarGrams: number;
  } | null>(null);

  const [ocrConfirmName, setOcrConfirmName] = useState('');
  const [ocrConfirmServingSize, setOcrConfirmServingSize] = useState('100');
  const [ocrConfirmConsumed, setOcrConfirmConsumed] = useState('100');
  const [ocrConfirmCalories, setOcrConfirmCalories] = useState('');
  const [ocrConfirmProtein, setOcrConfirmProtein] = useState('');
  const [ocrConfirmCarbs, setOcrConfirmCarbs] = useState('');
  const [ocrConfirmFat, setOcrConfirmFat] = useState('');
  const [ocrConfirmSodium, setOcrConfirmSodium] = useState('');
  const [ocrConfirmPotassium, setOcrConfirmPotassium] = useState('');
  const [ocrConfirmFiber, setOcrConfirmFiber] = useState('');
  const [ocrConfirmSugar, setOcrConfirmSugar] = useState('');

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

  const checkDuplicateName = (nameToCheck: string): boolean => {
    const cleanName = nameToCheck.replace(/\s*\(\s*\d+g\s*\)$/i, '').trim().toLowerCase();
    return favoriteFoods.some(fav => fav.name.replace(/\s*\(\s*\d+g\s*\)$/i, '').trim().toLowerCase() === cleanName);
  };

  useEffect(() => {
    if (duplicateError) {
      const timer = setTimeout(() => {
        setDuplicateError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [duplicateError]);

  const parseTesseractText = (text: string, fileName: string) => {
    const cleanFallbackName = fileName.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ").trim();
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);
    let guessedName = cleanFallbackName;
    const ignoredKeywords = [/nutrition/i, /facts/i, /amount/i, /serving/i, /daily/i, /value/i, /calories/i, /ingredients/i, /saturated/i, /trans/i, /cholesterol/i, /sodium/i, /carbohydrate/i, /protein/i];
    for (const line of lines) {
      if (!ignoredKeywords.some(keyword => keyword.test(line)) && line.length < 50 && !/^\d+$/.test(line)) {
        guessedName = line;
        break;
      }
    }

    const extractValue = (pattern: RegExp, defaultVal = 0): number => {
      const match = text.match(pattern);
      if (match && match[1]) {
        const parsed = parseFloat(match[1]);
        return isNaN(parsed) ? defaultVal : parsed;
      }
      return defaultVal;
    };

    const calories = extractValue(/(?:calories|calorie|energy|kcal)\s*(?:from fat)?\s*[:\-=]?\s*(\d+)/i, 0);
    const servingSizeGrams = extractValue(/(?:serving size|serv size|serving wt|serving\s*weight)\D*(\d+)\s*g/i, 100);
    const proteinGrams = extractValue(/(?:protein|proteins|proteinas)\D*([\d.]+)\s*g/i, 0);
    const carbsGrams = extractValue(/(?:total carbohydrate|carbohydrate|carbo|carbs|total carb)\D*([\d.]+)\s*g/i, 0);
    const fatGrams = extractValue(/(?:total fat|fat|fats|lipid|lipides)\D*([\d.]+)\s*g/i, 0);
    const sodiumMg = extractValue(/(?:sodium|sodio|natrium)\D*([\d.]+)\s*mg/i, 0);
    const potassiumMg = extractValue(/(?:potassium|potasio|kalium)\D*([\d.]+)\s*mg/i, 0);
    const fiberGrams = extractValue(/(?:dietary fiber|fiber|fibers|fibres)\D*([\d.]+)\s*g/i, 0);
    const sugarGrams = extractValue(/(?:sugars|sugar|total sugars|sucres)\D*([\d.]+)\s*g/i, 0);

    return {
      name: guessedName,
      servingSizeGrams: servingSizeGrams || 105,
      energyKcal: calories,
      proteinGrams,
      carbsGrams,
      fatGrams,
      sodiumMg,
      potassiumMg,
      fiberGrams,
      sugarGrams,
    };
  };

  const handleGeminiEnhance = async () => {
    if (!lastUploadedFile) return;

    triggerHaptic(20);
    setOcrScanning(true);
    setOcrProgress(null);
    setOcrError(null);
    setOcrMode('gemini');

    try {
      const response = await fetch("/api/meal-ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: lastUploadedFile.base64,
          mimeType: lastUploadedFile.mimeType,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to query server Gemini endpoint");
      }

      const data = await response.json();
      setOcrResult({
        name: data.name || 'Scanned Food Item',
        servingSizeGrams: data.servingSizeGrams || 100,
        energyKcal: data.energyKcal || 0,
        proteinGrams: data.proteinGrams || 0,
        carbsGrams: data.carbsGrams || 0,
        fatGrams: data.fatGrams || 0,
        sodiumMg: data.sodiumMg || 0,
        potassiumMg: data.potassiumMg || 0,
        fiberGrams: data.fiberGrams || 0,
        sugarGrams: data.sugarGrams || 0,
      });
      setOcrConfirmName(data.name || 'Scanned Food Item');
      setOcrConfirmServingSize(String(data.servingSizeGrams || 100));
      setOcrConfirmConsumed(String(data.servingSizeGrams || 100));
      setOcrConfirmCalories(String(data.energyKcal || 0));
      setOcrConfirmProtein(data.proteinGrams !== undefined ? String(data.proteinGrams) : '0');
      setOcrConfirmCarbs(data.carbsGrams !== undefined ? String(data.carbsGrams) : '0');
      setOcrConfirmFat(data.fatGrams !== undefined ? String(data.fatGrams) : '0');
      setOcrConfirmSodium(data.sodiumMg !== undefined ? String(data.sodiumMg) : '0');
      setOcrConfirmPotassium(data.potassiumMg !== undefined ? String(data.potassiumMg) : '0');
      setOcrConfirmFiber(data.fiberGrams !== undefined ? String(data.fiberGrams) : '0');
      setOcrConfirmSugar(data.sugarGrams !== undefined ? String(data.sugarGrams) : '0');
      triggerHaptic(40);
    } catch (err: any) {
      console.error("Gemini enhance error:", err);
      setOcrError(err.message || "Could not complete the Gemini Cloud Vision OCR scan.");
    } finally {
      setOcrScanning(false);
    }
  };

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    triggerHaptic(20);
    setOcrScanning(true);
    setOcrProgress(0);
    setOcrError(null);
    setOcrResult(null);
    setOcrMode('local');

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const commaIndex = base64String.indexOf(',');
      const justBase64 = base64String.substring(commaIndex + 1);
      setLastUploadedFile({ base64: justBase64, mimeType: file.type });
    };
    reader.readAsDataURL(file);

    try {
      // 1. Run local client-side Tesseract OCR inside user's browser
      const result = await Tesseract.recognize(
        file,
        'eng',
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              setOcrProgress(Math.round(m.progress * 100));
            }
          }
        }
      );

      const text = result.data.text;
      console.log("Raw Tesseract Text Extracted:", text);

      if (!text || text.trim().length === 0) {
        throw new Error("Tesseract did not extract any readable characters from the image.");
      }

      const parsed = parseTesseractText(text, file.name);

      setOcrResult(parsed);
      setOcrConfirmName(parsed.name);
      setOcrConfirmServingSize(String(parsed.servingSizeGrams));
      setOcrConfirmConsumed(String(parsed.servingSizeGrams));
      setOcrConfirmCalories(String(parsed.energyKcal));
      setOcrConfirmProtein(String(parsed.proteinGrams));
      setOcrConfirmCarbs(String(parsed.carbsGrams));
      setOcrConfirmFat(String(parsed.fatGrams));
      setOcrConfirmSodium(String(parsed.sodiumMg));
      setOcrConfirmPotassium(String(parsed.potassiumMg));
      setOcrConfirmFiber(String(parsed.fiberGrams));
      setOcrConfirmSugar(String(parsed.sugarGrams));

      triggerHaptic(40);
      setOcrScanning(false);
      setOcrProgress(null);
    } catch (err: any) {
      console.warn("Local Tesseract OCR reading failed. Falling back to high-fidelity Gemini OCR cloud API.", err);
      setOcrMode('gemini');
      setOcrProgress(null);

      // Trigger automatic high-fidelity fallback to Gemini
      const readerFallback = new FileReader();
      readerFallback.onloadend = async () => {
        const base64String = readerFallback.result as string;
        const commaIndex = base64String.indexOf(',');
        const justBase64 = base64String.substring(commaIndex + 1);
        const mimeType = file.type;

        try {
          const response = await fetch("/api/meal-ocr", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageBase64: justBase64, mimeType }),
          });

          if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || "Failed to scan nutrition info image");
          }

          const data = await response.json();
          setOcrResult({
            name: data.name || 'Scanned Food Item',
            servingSizeGrams: data.servingSizeGrams || 100,
            energyKcal: data.energyKcal || 0,
            proteinGrams: data.proteinGrams || 0,
            carbsGrams: data.carbsGrams || 0,
            fatGrams: data.fatGrams || 0,
            sodiumMg: data.sodiumMg || 0,
            potassiumMg: data.potassiumMg || 0,
            fiberGrams: data.fiberGrams || 0,
            sugarGrams: data.sugarGrams || 0,
          });
          setOcrConfirmName(data.name || 'Scanned Food Item');
          setOcrConfirmServingSize(String(data.servingSizeGrams || 100));
          setOcrConfirmConsumed(String(data.servingSizeGrams || 100));
          setOcrConfirmCalories(String(data.energyKcal || 0));
          setOcrConfirmProtein(data.proteinGrams !== undefined ? String(data.proteinGrams) : '0');
          setOcrConfirmCarbs(data.carbsGrams !== undefined ? String(data.carbsGrams) : '0');
          setOcrConfirmFat(data.fatGrams !== undefined ? String(data.fatGrams) : '0');
          setOcrConfirmSodium(data.sodiumMg !== undefined ? String(data.sodiumMg) : '0');
          setOcrConfirmPotassium(data.potassiumMg !== undefined ? String(data.potassiumMg) : '0');
          setOcrConfirmFiber(data.fiberGrams !== undefined ? String(data.fiberGrams) : '0');
          setOcrConfirmSugar(data.sugarGrams !== undefined ? String(data.sugarGrams) : '0');
          triggerHaptic(40);
        } catch (geminiErr: any) {
          console.error("Gemini fallback scan failed:", geminiErr);
          setOcrError("Both Tesseract local scan and Gemini cloud scan failed to read this image. Please check the image or crop it.");
        } finally {
          setOcrScanning(false);
        }
      };
      readerFallback.readAsDataURL(file);
    }
  };

  const handleOcrConfirmConsumedChange = (newConsumedStr: string) => {
    setOcrConfirmConsumed(newConsumedStr);
    const consumed = parseFloat(newConsumedStr);
    const refSize = parseFloat(ocrConfirmServingSize);
    if (!ocrResult || isNaN(consumed) || consumed <= 0 || isNaN(refSize) || refSize <= 0) return;

    const factor = consumed / refSize;

    setOcrConfirmCalories(String(Math.round(ocrResult.energyKcal * factor)));
    setOcrConfirmProtein(ocrResult.proteinGrams !== undefined ? String(parseFloat((ocrResult.proteinGrams * factor).toFixed(1))) : '0');
    setOcrConfirmCarbs(ocrResult.carbsGrams !== undefined ? String(parseFloat((ocrResult.carbsGrams * factor).toFixed(1))) : '0');
    setOcrConfirmFat(ocrResult.fatGrams !== undefined ? String(parseFloat((ocrResult.fatGrams * factor).toFixed(1))) : '0');
    setOcrConfirmSodium(ocrResult.sodiumMg !== undefined ? String(parseFloat((ocrResult.sodiumMg * factor).toFixed(1))) : '0');
    setOcrConfirmPotassium(ocrResult.potassiumMg !== undefined ? String(parseFloat((ocrResult.potassiumMg * factor).toFixed(1))) : '0');
    setOcrConfirmFiber(ocrResult.fiberGrams !== undefined ? String(parseFloat((ocrResult.fiberGrams * factor).toFixed(1))) : '0');
    setOcrConfirmSugar(ocrResult.sugarGrams !== undefined ? String(parseFloat((ocrResult.sugarGrams * factor).toFixed(1))) : '0');
  };

  const handleSaveOcrConfirmedMeal = () => {
    if (!ocrConfirmName.trim()) return;

    if (checkDuplicateName(ocrConfirmName)) {
      triggerHaptic(30);
      setDuplicateError("Same item is present in the favorites.");
      return;
    }

    const consumed = parseFloat(ocrConfirmConsumed) || 100;
    const finalCals = parseInt(ocrConfirmCalories) || 0;
    const finalProtein = ocrConfirmProtein ? parseFloat(ocrConfirmProtein) : undefined;
    const finalCarbs = ocrConfirmCarbs ? parseFloat(ocrConfirmCarbs) : undefined;
    const finalFat = ocrConfirmFat ? parseFloat(ocrConfirmFat) : undefined;
    const finalSodium = ocrConfirmSodium ? parseFloat(ocrConfirmSodium) : undefined;
    const finalPotassium = ocrConfirmPotassium ? parseFloat(ocrConfirmPotassium) : undefined;
    const finalFiber = ocrConfirmFiber ? parseFloat(ocrConfirmFiber) : undefined;
    const finalSugar = ocrConfirmSugar ? parseFloat(ocrConfirmSugar) : undefined;

    const newMeal: Meal = {
      id: Date.now().toString(),
      name: `${ocrConfirmName.trim()} (${Math.round(consumed)}g)`,
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

    const cleanName = ocrConfirmName.trim();
    const favIndex = favoriteFoods.findIndex(f => f.name.toLowerCase() === cleanName.toLowerCase());
    if (favIndex !== -1) {
      const fav = favoriteFoods[favIndex];
      const refGrams = fav.referenceGrams || 100;
      const scaleBack = refGrams / consumed;

      const updatedFav: FavoriteFood = {
        ...fav,
        calories: Math.round(finalCals * scaleBack),
        protein: finalProtein !== undefined ? parseFloat((finalProtein * scaleBack).toFixed(1)) : 0,
        carbs: finalCarbs !== undefined ? parseFloat((finalCarbs * scaleBack).toFixed(1)) : 0,
        fat: finalFat !== undefined ? parseFloat((finalFat * scaleBack).toFixed(1)) : 0,
        sodium: finalSodium !== undefined ? parseFloat((finalSodium * scaleBack).toFixed(1)) : 0,
        potassium: finalPotassium !== undefined ? parseFloat((finalPotassium * scaleBack).toFixed(1)) : 0,
        fiber: finalFiber !== undefined ? parseFloat((finalFiber * scaleBack).toFixed(1)) : 0,
        sugar: finalSugar !== undefined ? parseFloat((finalSugar * scaleBack).toFixed(1)) : 0,
      };

      setFavoriteFoods(prev => prev.map((f, idx) => idx === favIndex ? updatedFav : f));
    }

    setOcrResult(null);
    triggerHaptic(30);
  };

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

  const handleEditWeightGramsChange = (newWeightStr: string) => {
    setEditMealWeightGrams(newWeightStr);
    const newWeight = parseFloat(newWeightStr);
    if (!baselineMeal || isNaN(newWeight) || newWeight <= 0) return;

    const baseWeight = baselineMeal.weightGrams || 100;
    const factor = newWeight / baseWeight;

    // Proportionally update calories and nutrients
    setEditMealCalories(String(Math.round(baselineMeal.calories * factor)));
    setEditMealProtein(baselineMeal.protein !== undefined ? String(parseFloat((baselineMeal.protein * factor).toFixed(1))) : '');
    setEditMealCarbs(baselineMeal.carbs !== undefined ? String(parseFloat((baselineMeal.carbs * factor).toFixed(1))) : '');
    setEditMealFat(baselineMeal.fat !== undefined ? String(parseFloat((baselineMeal.fat * factor).toFixed(1))) : '');
    setEditMealSodium(baselineMeal.sodium !== undefined ? String(parseFloat((baselineMeal.sodium * factor).toFixed(1))) : '');
    setEditMealPotassium(baselineMeal.potassium !== undefined ? String(parseFloat((baselineMeal.potassium * factor).toFixed(1))) : '');
    setEditMealFiber(baselineMeal.fiber !== undefined ? String(parseFloat((baselineMeal.fiber * factor).toFixed(1))) : '');
    setEditMealSugar(baselineMeal.sugar !== undefined ? String(parseFloat((baselineMeal.sugar * factor).toFixed(1))) : '');

    // Update the (Xg) suffix in the name
    const regex = /\(\d+g\)$/;
    if (regex.test(editMealName)) {
      setEditMealName(editMealName.replace(regex, `(${Math.round(newWeight)}g)`));
    } else if (regex.test(baselineMeal.name)) {
      setEditMealName(baselineMeal.name.replace(regex, `(${Math.round(newWeight)}g)`));
    } else {
      const cleanName = editMealName.replace(/\s*\(\s*\d+g\s*\)$/i, '').trim();
      setEditMealName(`${cleanName} (${Math.round(newWeight)}g)`);
    }
  };

  const startMealEditing = (item: Meal) => {
    setEditingMealId(item.id);
    setBaselineMeal(item);
    setEditMealName(item.name);
    setEditMealCalories(String(item.calories));
    setEditMealProtein(item.protein !== undefined ? String(item.protein) : '');
    setEditMealCarbs(item.carbs !== undefined ? String(item.carbs) : '');
    setEditMealFat(item.fat !== undefined ? String(item.fat) : '');
    setEditMealSodium(item.sodium !== undefined ? String(item.sodium) : '');
    setEditMealPotassium(item.potassium !== undefined ? String(item.potassium) : '');
    setEditMealFiber(item.fiber !== undefined ? String(item.fiber) : '');
    setEditMealSugar(item.sugar !== undefined ? String(item.sugar) : '');
    setEditMealWeightGrams(item.weightGrams !== undefined ? String(Math.round(item.weightGrams)) : '100');
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
          weightGrams: editMealWeightGrams ? parseFloat(editMealWeightGrams) : undefined,
        };
      }
      return item;
    });

    const totalCals = updatedMeals.reduce((sum, item) => sum + item.calories, 0);

    onChange({
      meals: updatedMeals,
      calories: totalCals,
    });

    // Propagate parameter changes directly to Favorite foods if this meal is marked as favorite
    const cleanName = editMealName.replace(/\s*\(\s*\d+g\s*\)$/i, '').trim();
    const favIndex = favoriteFoods.findIndex(f => f.name.toLowerCase() === cleanName.toLowerCase());
    if (favIndex !== -1) {
      const fav = favoriteFoods[favIndex];
      const refGrams = fav.referenceGrams || 100;
      const consumedGrams = parseFloat(editMealWeightGrams) || 100;
      const scaleBack = refGrams / consumedGrams;

      const updatedFav: FavoriteFood = {
        ...fav,
        calories: Math.round((parseInt(editMealCalories) || 0) * scaleBack),
        protein: editMealProtein ? parseFloat((parseFloat(editMealProtein) * scaleBack).toFixed(1)) : 0,
        carbs: editMealCarbs ? parseFloat((parseFloat(editMealCarbs) * scaleBack).toFixed(1)) : 0,
        fat: editMealFat ? parseFloat((parseFloat(editMealFat) * scaleBack).toFixed(1)) : 0,
        sodium: editMealSodium ? parseFloat((parseFloat(editMealSodium) * scaleBack).toFixed(1)) : 0,
        potassium: editMealPotassium ? parseFloat((parseFloat(editMealPotassium) * scaleBack).toFixed(1)) : 0,
        fiber: editMealFiber ? parseFloat((parseFloat(editMealFiber) * scaleBack).toFixed(1)) : 0,
        sugar: editMealSugar ? parseFloat((parseFloat(editMealSugar) * scaleBack).toFixed(1)) : 0,
      };

      setFavoriteFoods(prev => prev.map((f, idx) => idx === favIndex ? updatedFav : f));
    }

    setEditingMealId(null);
    setBaselineMeal(null);
  };

  // Add customized favorite food creator form
  const handleCreateFavorite = (e: FormEvent) => {
    e.preventDefault();
    if (!favName.trim()) return;

    if (checkDuplicateName(favName)) {
      triggerHaptic(25);
      setDuplicateError("Same item is present in the favorites.");
      return;
    }

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

  const handleAddToFavoriteFoods = (item: Meal) => {
    triggerHaptic(20);
    const cleanName = item.name.replace(/\s*\(\s*\d+g\s*\)$/, '').trim();
    const exists = favoriteFoods.some(fav => fav.name.toLowerCase() === cleanName.toLowerCase());
    if (exists) {
      // Toggle off if clicked again
      setFavoriteFoods((prev) => prev.filter(fav => fav.name.toLowerCase() !== cleanName.toLowerCase()));
      return;
    }

    const newFav: FavoriteFood = {
      id: 'custom-' + Date.now().toString(),
      name: cleanName,
      calories: item.calories,
      protein: item.protein || 0,
      carbs: item.carbs || 0,
      fat: item.fat || 0,
      sodium: item.sodium || 0,
      potassium: item.potassium || 0,
      fiber: item.fiber || 0,
      sugar: item.sugar || 0,
      referenceGrams: item.weightGrams || 100,
    };
    setFavoriteFoods((prev) => [newFav, ...prev]);
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
              style={{ width: `${Math.min((waterRecord.totalMl / (settings.targetWaterMl || 2000)) * 100, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono">
            <span>Goal: {settings.targetWaterMl || 2000} ml</span>
            <span className="font-semibold text-sky-500 dark:text-sky-400">
              {Math.round((waterRecord.totalMl / (settings.targetWaterMl || 2000)) * 100)}%
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

      {/* 2. Interactive meal logging action panel */}
      <div className="bg-white/75 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/85 p-5 rounded-3xl shadow-subtle dark:shadow-none space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/60 pb-3 flex-wrap">
          <div>
            <h3 className="text-sm font-sans font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Flame className="w-4.5 h-4.5 text-rose-500" />
              Logged Meals Today
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Track custom food intakes, add nutrients, or scan label using Gemini.</p>
          </div>
          
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                triggerHaptic(20);
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
                setShowAddMealModal(true);
              }}
              className="cursor-pointer px-3.5 py-1.5 bg-rose-500 hover:bg-rose-600 text-xs font-semibold text-white rounded-xl transition flex items-center gap-1.5 shadow-md shadow-rose-500/10 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Food Item</span>
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowScanOptions((prev) => !prev)}
                className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/10 hover:bg-violet-500/20 hover:text-violet-600 dark:hover:text-violet-350 border border-violet-500/25 rounded-xl text-[11.5px] font-sans font-bold text-violet-550 dark:text-violet-400 dark:border-violet-500/30 transition select-none"
              >
                <Sparkles className="w-3.5 h-3.5 text-violet-500 animate-pulse" />
                <span>Scan Nutrition Label</span>
              </button>

              {/* Hidden file inputs for Camera and Gallery */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  handleImageUpload(e);
                  setShowScanOptions(false);
                }}
                disabled={ocrScanning}
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  handleImageUpload(e);
                  setShowScanOptions(false);
                }}
                disabled={ocrScanning}
              />

              {/* Popup drop-down for selections */}
              {showScanOptions && (
                <>
                  <div 
                    className="fixed inset-0 z-30" 
                    onClick={() => setShowScanOptions(false)} 
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-2 z-40 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150 text-left">
                    <button
                      type="button"
                      onClick={() => {
                        cameraInputRef.current?.click();
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-violet-50 dark:hover:bg-violet-500/15 hover:text-violet-600 rounded-xl transition flex items-center gap-2 cursor-pointer"
                    >
                      <Camera className="w-4 h-4 text-violet-500" />
                      <span>Camera (Take Photo)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        galleryInputRef.current?.click();
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-violet-50 dark:hover:bg-violet-500/15 hover:text-violet-600 rounded-xl transition flex items-center gap-2 cursor-pointer"
                    >
                      <Image className="w-4 h-4 text-violet-500" />
                      <span>Gallery (Upload Image)</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {duplicateError && (
          <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs text-rose-600 dark:text-rose-400 font-sans font-medium animate-in fade-in duration-200 text-left">
            <AlertCircle className="w-4.5 h-4.5 text-rose-500 flex-shrink-0" />
            <span className="flex-grow">{duplicateError}</span>
            <button 
              type="button" 
              onClick={() => setDuplicateError(null)} 
              className="px-1 text-rose-600 dark:text-rose-400 font-bold"
            >
              &times;
            </button>
          </div>
        )}

        {ocrError && (
          <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs text-amber-600 dark:text-amber-400 font-sans font-medium animate-in fade-in duration-200 text-left">
            <AlertCircle className="w-4.5 h-4.5 text-amber-500 flex-shrink-0" />
            <span className="flex-grow">{ocrError}</span>
            <button 
              type="button" 
              onClick={() => setOcrError(null)} 
              className="px-1 text-amber-600 dark:text-amber-450 font-bold"
            >
              &times;
            </button>
          </div>
        )}



        {/* List of active today's items */}
        {record.meals.length > 0 && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 dark:text-slate-500 block">Logged meals today</span>
            <div className="max-h-[30vh] overflow-y-auto space-y-2 pr-1">
              {record.meals.map((item) => {
                return (
                  <div
                    key={item.id}
                    className="flex flex-col gap-2 p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl hover:border-slate-200 dark:hover:border-slate-700 transition"
                  >
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
                        {(() => {
                          const cleanNameForFav = item.name.replace(/\s*\(\s*\d+g\s*\)$/i, '').trim().toLowerCase();
                          const isAddedToFav = favoriteFoods.some(fav => {
                            const cleanFavName = fav.name.replace(/\s*\(\s*\d+g\s*\)$/i, '').trim().toLowerCase();
                            return cleanFavName === cleanNameForFav;
                          });
                          return (
                            <button
                              id={`fav-toggle-logged-${item.id}`}
                              type="button"
                              onClick={() => handleAddToFavoriteFoods(item)}
                              className={`p-1.5 rounded-lg transition ${
                                isAddedToFav
                                  ? 'text-rose-500 bg-rose-50 dark:bg-rose-950/30'
                                  : 'text-slate-400 dark:text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20'
                              }`}
                              title={isAddedToFav ? "Remove from Favorites" : "Add to Favorites"}
                            >
                              <Heart className={`w-4 h-4 ${isAddedToFav ? 'fill-rose-500' : ''}`} />
                            </button>
                          );
                        })()}
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
                          onClick={() => {
                            triggerHaptic(20);
                            setConfirmDeleteMealId(item.id);
                          }}
                          className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition"
                          title="Remove meal log"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
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
            onClick={() => setShowAddFavoriteForm(true)}
            className="text-xs text-indigo-500 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
          >
            + Add Favorite Item
          </button>
        </div>

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
                {isLogging ? (
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
                          onClick={() => setConfirmDeleteFavId(fav.id)}
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

      {/* 5. OCR Loading/Scanning Overlay Modal */}
      {ocrScanning && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-sm w-full p-6 space-y-4 text-center animate-in zoom-in-95 duration-200 font-sans">
            <div className="mx-auto p-3 bg-violet-500/10 dark:bg-violet-500/20 rounded-full w-fit animate-bounce">
              <Scan className="w-6 h-6 text-violet-500 animate-pulse" />
            </div>
            <div className="flex flex-col items-center gap-1.5 w-full">
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 text-violet-550 dark:text-violet-400 animate-spin" />
                <span className="text-xs font-bold text-slate-750 dark:text-slate-300">
                  {ocrMode === 'local' 
                    ? `Tesseract.js OCR engine: ${ocrProgress !== null ? ocrProgress : 0}%` 
                    : "Refining label layout with Gemini AI..."}
                </span>
              </div>
              {ocrMode === 'local' && ocrProgress !== null && (
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-0.5 shadow-inner max-w-[200px]">
                  <div 
                    className="bg-violet-500 h-full rounded-full transition-all duration-300 shadow-md shadow-violet-500/30"
                    style={{ width: `${ocrProgress}%` }}
                  />
                </div>
              )}
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono leading-normal">
              {ocrMode === 'local' 
                ? "Extracting nutrition metrics inside your browser safely. Unaligned layouts automatically utilize Gemini cloud fallback." 
                : "Scanning structured calorie & macronutrient factors layout details from label matrix."}
            </p>
          </div>
        </div>
      )}

      {/* 6. OCR Confirmation Modal Popup */}
      {ocrResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto text-left font-sans">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs uppercase font-mono tracking-wider font-extrabold text-violet-600 dark:text-violet-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-violet-500 animate-pulse" />
                  Scanned Facts Confirmation
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold font-mono border ${
                  ocrMode === 'local' 
                    ? 'bg-blue-500/10 border-blue-500/25 text-blue-600 dark:text-blue-400' 
                    : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400'
                }`}>
                  {ocrMode === 'local' ? '⚡ Tesseract.js Client OCR' : '✨ Gemini AI Enhanced'}
                </span>
              </div>
            </div>

            <p className="text-[11.5px] text-slate-500 dark:text-slate-400 leading-relaxed">
              We parsed these details from your label image. Please adjust the <strong>grams consumed</strong> below—it will proportionately rescale the calories & nutrients to match what you actually ate!
            </p>

            <div className="space-y-3">
              {/* Name field */}
              <div>
                <span className="text-[9px] uppercase font-mono text-slate-400 dark:text-slate-500 block mb-1 font-bold">Food Description</span>
                <input
                  type="text"
                  value={ocrConfirmName}
                  onChange={(e) => setOcrConfirmName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-violet-500 text-slate-800 dark:text-slate-100 font-medium"
                />
              </div>

              {/* Servings vs consumed weight */}
              <div className="grid grid-cols-2 gap-3 bg-violet-500/5 dark:bg-violet-500/10 border border-violet-500/15 p-3 rounded-2xl">
                <div>
                  <span className="text-[9px] uppercase font-mono text-violet-600 dark:text-violet-400 block mb-1 font-bold">Serving Weight (g)</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={ocrConfirmServingSize}
                    onChange={(e) => setOcrConfirmServingSize(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <span className="text-[9px] uppercase font-mono text-indigo-500 dark:text-indigo-400 block mb-1 font-bold">Grams Consumed (g)</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={ocrConfirmConsumed}
                    onChange={(e) => handleOcrConfirmConsumedChange(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-indigo-200 dark:border-indigo-900 rounded-lg text-slate-900 dark:text-slate-100 font-mono font-bold focus:ring-1 focus:ring-indigo-400"
                  />
                </div>
              </div>

              {/* Calories and macros */}
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <span className="text-[9px] uppercase font-mono text-slate-400 dark:text-slate-500 block mb-1 font-bold truncate">Energy (kcal)</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={ocrConfirmCalories}
                    onChange={(e) => setOcrConfirmCalories(e.target.value)}
                    className="w-full p-2 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <span className="text-[9px] uppercase font-mono text-slate-400 dark:text-slate-500 block mb-1 font-bold truncate font-mono">Protein (g)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    value={ocrConfirmProtein}
                    onChange={(e) => setOcrConfirmProtein(e.target.value)}
                    className="w-full p-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <span className="text-[9px] uppercase font-mono text-slate-400 dark:text-slate-500 block mb-1 font-bold truncate font-mono">Carbs (g)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    value={ocrConfirmCarbs}
                    onChange={(e) => setOcrConfirmCarbs(e.target.value)}
                    className="w-full p-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <span className="text-[9px] uppercase font-mono text-slate-400 dark:text-slate-500 block mb-1 font-bold truncate font-mono">Fat (g)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    value={ocrConfirmFat}
                    onChange={(e) => setOcrConfirmFat(e.target.value)}
                    className="w-full p-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 font-mono"
                  />
                </div>
              </div>

              {/* Micro-nutrients row */}
              <div className="grid grid-cols-4 gap-2 text-[10px]">
                <div>
                  <span className="text-[8px] uppercase font-mono text-slate-400 dark:text-slate-500 block mb-1 font-bold truncate font-mono">Sodium (mg)</span>
                  <input
                    type="number"
                    value={ocrConfirmSodium}
                    onChange={(e) => setOcrConfirmSodium(e.target.value)}
                    className="w-full p-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <span className="text-[8px] uppercase font-mono text-slate-400 dark:text-slate-500 block mb-1 font-bold truncate font-mono">Potassium (mg)</span>
                  <input
                    type="number"
                    value={ocrConfirmPotassium}
                    onChange={(e) => setOcrConfirmPotassium(e.target.value)}
                    className="w-full p-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <span className="text-[8px] uppercase font-mono text-slate-400 dark:text-slate-500 block mb-1 font-bold truncate font-mono">Fiber (g)</span>
                  <input
                    type="number"
                    value={ocrConfirmFiber}
                    onChange={(e) => setOcrConfirmFiber(e.target.value)}
                    className="w-full p-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <span className="text-[8px] uppercase font-mono text-slate-400 dark:text-slate-500 block mb-1 font-bold truncate font-mono">Sugar (g)</span>
                  <input
                    type="number"
                    value={ocrConfirmSugar}
                    onChange={(e) => setOcrConfirmSugar(e.target.value)}
                    className="w-full p-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Gemini Upgrade Prompt Card */}
            {ocrMode === 'local' && lastUploadedFile && (
              <div className="p-3 bg-violet-500/5 dark:bg-violet-500/10 border border-dashed border-violet-500/20 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs leading-relaxed">
                <div className="text-slate-500 dark:text-slate-400 text-left">
                  <span className="font-bold text-slate-705 dark:text-slate-300 flex items-center gap-1 mb-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-violet-500 animate-pulse" />
                    Layout not scanned perfectly?
                  </span>
                  Refine nutritional matrices & dense columns with our cloud multimodal AI verification.
                </div>
                <button
                  type="button"
                  onClick={handleGeminiEnhance}
                  className="px-3 py-1.5 text-[11px] font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition flex-shrink-0 cursor-pointer shadow-sm shadow-violet-500/20 active:scale-95 duration-100 animate-pulse"
                >
                  Enhance with Gemini
                </button>
              </div>
            )}

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setOcrResult(null)}
                className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleSaveOcrConfirmedMeal}
                className="flex-[2] py-2 bg-violet-600 hover:bg-violet-700 text-xs font-bold text-white rounded-xl transition shadow-lg shadow-violet-500/15 flex items-center justify-center gap-2 cursor-pointer active:scale-[99%]"
              >
                <Check className="w-4 h-4" />
                <span>Confirm & Log Meal</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP 1: Add Favorite Item Modal */}
      {showAddFavoriteForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-350">
          <form 
            onSubmit={handleCreateFavorite} 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-sm w-full p-5 space-y-4 text-left animate-in zoom-in-95 duration-150 font-sans"
          >
            <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-800/80 pb-2.5">
              <span className="text-xs uppercase font-mono tracking-wider font-extrabold text-indigo-650 dark:text-indigo-400 flex items-center gap-1.5">
                <Heart className="w-4.5 h-4.5 text-rose-500 fill-rose-500 animate-pulse" />
                Add Favorite Item
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="sm:col-span-2">
                  <span className="text-[9px] uppercase font-mono text-slate-400 dark:text-slate-440 block mb-0.5 font-bold">Food Description</span>
                  <input
                    type="text"
                    required
                    placeholder="Greek Yogurt Cup"
                    value={favName}
                    onChange={(e) => setFavName(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-450 text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <span className="text-[9px] uppercase font-mono text-slate-400 dark:text-slate-440 block mb-0.5 font-bold">Serving (g)</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    required
                    value={favRefGrams}
                    onChange={(e) => setFavRefGrams(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-450 text-slate-800 dark:text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <span className="text-[8px] uppercase font-mono text-slate-400 dark:text-slate-440 block mb-0.5 font-bold truncate">kcal</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="0"
                    required
                    value={favCalories}
                    onChange={(e) => setFavCalories(e.target.value)}
                    className="w-full p-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 font-mono text-center"
                  />
                </div>
                <div>
                  <span className="text-[8px] uppercase font-mono text-slate-400 dark:text-slate-440 block mb-0.5 font-bold truncate">Pro (g)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    placeholder="0"
                    value={favProtein}
                    onChange={(e) => setFavProtein(e.target.value)}
                    className="w-full p-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 font-mono text-center"
                  />
                </div>
                <div>
                  <span className="text-[8px] uppercase font-mono text-slate-400 dark:text-slate-440 block mb-0.5 font-bold truncate">Carb (g)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    placeholder="0"
                    value={favCarbs}
                    onChange={(e) => setFavCarbs(e.target.value)}
                    className="w-full p-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 font-mono text-center"
                  />
                </div>
                <div>
                  <span className="text-[8px] uppercase font-mono text-slate-400 dark:text-slate-440 block mb-0.5 font-bold truncate">Fat (g)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    placeholder="0"
                    value={favFat}
                    onChange={(e) => setFavFat(e.target.value)}
                    className="w-full p-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 font-mono text-center"
                  />
                </div>
              </div>

              {/* Advanced Micros row */}
              <div className="grid grid-cols-4 gap-2 text-[10px] pt-1 border-t border-slate-100 dark:border-slate-800/40">
                <div>
                  <span className="text-[8px] uppercase font-mono text-slate-400 dark:text-slate-440 block mb-0.5 truncate font-bold">Sugar (g)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    placeholder="0"
                    value={favSugar}
                    onChange={(e) => setFavSugar(e.target.value)}
                    className="w-full p-1 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-800 dark:text-slate-100 font-mono text-center font-bold"
                  />
                </div>
                <div>
                  <span className="text-[8px] uppercase font-mono text-slate-400 dark:text-slate-440 block mb-0.5 truncate font-bold">Fiber (g)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    placeholder="0"
                    value={favFiber}
                    onChange={(e) => setFavFiber(e.target.value)}
                    className="w-full p-1 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-800 dark:text-slate-100 font-mono text-center font-bold"
                  />
                </div>
                <div>
                  <span className="text-[8px] uppercase font-mono text-slate-400 dark:text-slate-440 block mb-0.5 truncate font-mono font-bold">Na (mg)</span>
                  <input
                    type="number"
                    placeholder="0"
                    value={favSodium}
                    onChange={(e) => setFavSodium(e.target.value)}
                    className="w-full p-1 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-800 dark:text-slate-100 font-mono text-center font-bold"
                  />
                </div>
                <div>
                  <span className="text-[8px] uppercase font-mono text-slate-400 dark:text-slate-440 block mb-0.5 truncate font-mono font-bold">K (mg)</span>
                  <input
                    type="number"
                    placeholder="0"
                    value={favPotassium}
                    onChange={(e) => setFavPotassium(e.target.value)}
                    className="w-full p-1 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-800 dark:text-slate-100 font-mono text-center font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowAddFavoriteForm(false);
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
                }}
                className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-[2] py-2 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white rounded-xl transition shadow-lg shadow-indigo-550/15 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Save Item</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* POPUP 2: Edit Favorite Item Modal */}
      {editingFavoriteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-350">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-sm w-full p-5 space-y-4 text-left animate-in zoom-in-95 duration-150 font-sans">
            <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-800/80 pb-2.5">
              <span className="text-xs uppercase font-mono tracking-wider font-extrabold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <Edit3 className="w-4.5 h-4.5 text-indigo-500 animate-pulse" />
                Edit Favorite Food Card
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[9px] uppercase font-mono text-slate-400 dark:text-slate-440 block mb-0.5 font-bold">Food Description</span>
                <input
                  type="text"
                  value={favName}
                  onChange={(e) => setFavName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-455 text-slate-800 dark:text-slate-100 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5 bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/15 p-2.5 rounded-2xl">
                <div>
                  <span className="text-[8px] uppercase font-mono text-slate-400 dark:text-slate-440 block mb-0.5 font-mono">Ref Serving (g)</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={favRefGrams}
                    onChange={(e) => setFavRefGrams(e.target.value)}
                    className="w-full px-2 py-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-800 dark:text-slate-100 font-mono text-center font-bold"
                  />
                </div>
                <div>
                  <span className="text-[8px] uppercase font-mono text-slate-400 dark:text-slate-440 block mb-0.5 font-mono font-bold">Energy (kcal)</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={favCalories}
                    onChange={(e) => setFavCalories(e.target.value)}
                    className="w-full px-2 py-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-800 dark:text-slate-100 font-mono text-center font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-[9px] uppercase font-mono text-slate-400 dark:text-slate-440 block mb-0.5 font-bold truncate">Pro (g)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    value={favProtein}
                    onChange={(e) => setFavProtein(e.target.value)}
                    className="w-full p-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 font-mono text-center"
                  />
                </div>
                <div>
                  <span className="text-[9px] uppercase font-mono text-slate-400 dark:text-slate-440 block mb-0.5 font-bold truncate">Carb (g)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    value={favCarbs}
                    onChange={(e) => setFavCarbs(e.target.value)}
                    className="w-full p-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 font-mono text-center"
                  />
                </div>
                <div>
                  <span className="text-[9px] uppercase font-mono text-slate-400 dark:text-slate-440 block mb-0.5 font-bold truncate">Fat (g)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    value={favFat}
                    onChange={(e) => setFavFat(e.target.value)}
                    className="w-full p-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 font-mono text-center"
                  />
                </div>
              </div>

              {/* Micros Details */}
              <div className="grid grid-cols-4 gap-2 text-[10px] pt-1.5 border-t border-slate-100 dark:border-slate-800/40">
                <div>
                  <span className="text-[9px] uppercase font-mono text-slate-400 dark:text-slate-440 block mb-0.5 truncate font-bold">Sugar (g)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    value={favSugar}
                    onChange={(e) => setFavSugar(e.target.value)}
                    className="w-full p-1 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-center text-slate-800 dark:text-slate-100 font-mono font-bold"
                  />
                </div>
                <div>
                  <span className="text-[9px] uppercase font-mono text-slate-400 dark:text-slate-440 block mb-0.5 truncate font-bold">Fiber (g)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    value={favFiber}
                    onChange={(e) => setFavFiber(e.target.value)}
                    className="w-full p-1 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-center text-slate-800 dark:text-slate-100 font-mono font-bold"
                  />
                </div>
                <div>
                  <span className="text-[9px] uppercase font-mono text-slate-400 dark:text-slate-440 block mb-0.5 truncate font-mono font-bold">Na (mg)</span>
                  <input
                    type="number"
                    value={favSodium}
                    onChange={(e) => setFavSodium(e.target.value)}
                    className="w-full p-1 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-center text-slate-800 dark:text-slate-100 font-mono font-bold"
                  />
                </div>
                <div>
                  <span className="text-[9px] uppercase font-mono text-slate-400 dark:text-slate-440 block mb-0.5 truncate font-mono font-bold">K (mg)</span>
                  <input
                    type="number"
                    value={favPotassium}
                    onChange={(e) => setFavPotassium(e.target.value)}
                    className="w-full p-1 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-center text-slate-800 dark:text-slate-100 font-mono font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2.5">
              <button
                type="button"
                onClick={() => setEditingFavoriteId(null)}
                className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveFavEdit(editingFavoriteId)}
                className="flex-[2] py-2 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white rounded-xl transition shadow-lg shadow-indigo-550/15 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP: Confirm Delete Favorite Food Modal */}
      {confirmDeleteFavId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-sm w-full p-5 space-y-4 text-left animate-in zoom-in-95 duration-150 font-sans">
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50">Delete Favorite Food?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Are you sure you want to delete <span className="font-semibold text-slate-850 dark:text-slate-200">"{favoriteFoods.find(f => f.id === confirmDeleteFavId)?.name}"</span>? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-2.5 pt-1.5">
              <button
                type="button"
                onClick={() => setConfirmDeleteFavId(null)}
                className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmDeleteFavId) {
                    handleDeleteFavorite(confirmDeleteFavId);
                    setConfirmDeleteFavId(null);
                  }
                }}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white rounded-xl transition shadow-lg shadow-rose-550/15 cursor-pointer animate-none"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP: Confirm Delete Logged Meal Modal */}
      {confirmDeleteMealId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-sm w-full p-5 space-y-4 text-left animate-in zoom-in-95 duration-150 font-sans">
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50">Delete Logged Meal?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Are you sure you want to delete <span className="font-semibold text-slate-850 dark:text-slate-200">"{record.meals.find(m => m.id === confirmDeleteMealId)?.name}"</span> from today's log? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-2.5 pt-1.5">
              <button
                type="button"
                onClick={() => setConfirmDeleteMealId(null)}
                className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmDeleteMealId) {
                    handleDeleteMeal(confirmDeleteMealId);
                    setConfirmDeleteMealId(null);
                  }
                }}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white rounded-xl transition shadow-lg shadow-rose-550/15 cursor-pointer animate-none"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP 3: Edit Logged Meal Today Modal */}
      {editingMealId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-350">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-sm w-full p-5 space-y-4 text-left animate-in zoom-in-95 duration-150 font-sans">
            <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-800/80 pb-2.5">
              <span className="text-xs uppercase font-mono tracking-wider font-extrabold text-violet-600 dark:text-violet-400 flex items-center gap-1.5">
                <Edit3 className="w-4.5 h-4.5 text-violet-500" />
                Edit Logged Meal
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[9px] uppercase font-mono text-slate-400 dark:text-slate-500 block mb-0.5 font-bold">Meal Name Description</span>
                <input
                  type="text"
                  value={editMealName}
                  onChange={(e) => setEditMealName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-violet-400 text-slate-800 dark:text-slate-100 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5 bg-violet-500/5 dark:bg-violet-500/10 border border-violet-500/15 p-2.5 rounded-2xl">
                <div>
                  <span className="text-[9px] uppercase font-mono text-violet-600 dark:text-violet-400 block mb-0.5 font-bold">Weight Eaten (g)</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={editMealWeightGrams}
                    onChange={(e) => handleEditWeightGramsChange(e.target.value)}
                    className="w-full px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 font-mono text-center font-bold"
                  />
                </div>
                <div>
                  <span className="text-[9px] uppercase font-mono text-slate-400 dark:text-slate-500 block mb-0.5 font-bold">Energy (kcal)</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={editMealCalories}
                    onChange={(e) => setEditMealCalories(e.target.value)}
                    className="w-full px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 font-mono text-center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-[9px] uppercase font-mono text-slate-400 dark:text-slate-500 block mb-0.5 font-bold truncate">Protein (g)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="-"
                    step="0.1"
                    value={editMealProtein}
                    onChange={(e) => setEditMealProtein(e.target.value)}
                    className="w-full p-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 font-mono text-center"
                  />
                </div>
                <div>
                  <span className="text-[9px] uppercase font-mono text-slate-400 dark:text-slate-500 block mb-0.5 font-bold truncate">Carbs (g)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="-"
                    step="0.1"
                    value={editMealCarbs}
                    onChange={(e) => setEditMealCarbs(e.target.value)}
                    className="w-full p-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 font-mono text-center"
                  />
                </div>
                <div>
                  <span className="text-[9px] uppercase font-mono text-slate-400 dark:text-slate-500 block mb-0.5 font-bold truncate">Fat (g)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="-"
                    step="0.1"
                    value={editMealFat}
                    onChange={(e) => setEditMealFat(e.target.value)}
                    className="w-full p-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 font-mono text-center"
                  />
                </div>
              </div>

              {/* Advanced micro row */}
              <div className="grid grid-cols-4 gap-2 text-[10px] pt-1.5 border-t border-slate-100 dark:border-slate-800/40">
                <div>
                  <span className="text-[8px] uppercase font-mono text-slate-400 dark:text-slate-500 block mb-0.5 truncate">Sugar (g)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="-"
                    step="0.1"
                    value={editMealSugar}
                    onChange={(e) => setEditMealSugar(e.target.value)}
                    className="w-full p-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-center text-slate-800 dark:text-slate-100 font-mono font-bold"
                  />
                </div>
                <div>
                  <span className="text-[8px] uppercase font-mono text-slate-400 dark:text-slate-500 block mb-0.5 truncate">Fiber (g)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="-"
                    step="0.1"
                    value={editMealFiber}
                    onChange={(e) => setEditMealFiber(e.target.value)}
                    className="w-full p-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-center text-slate-800 dark:text-slate-100 font-mono font-bold"
                  />
                </div>
                <div>
                  <span className="text-[8px] uppercase font-mono text-slate-400 dark:text-slate-500 block mb-0.5 truncate font-mono">Na (mg)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="-"
                    value={editMealSodium}
                    onChange={(e) => setEditMealSodium(e.target.value)}
                    className="w-full p-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-center text-slate-800 dark:text-slate-100 font-mono font-bold"
                  />
                </div>
                <div>
                  <span className="text-[8px] uppercase font-mono text-slate-400 dark:text-slate-500 block mb-0.5 truncate font-mono">K (mg)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="-"
                    value={editMealPotassium}
                    onChange={(e) => setEditMealPotassium(e.target.value)}
                    className="w-full p-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-center text-slate-800 dark:text-slate-100 font-mono font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2.5">
              <button
                type="button"
                onClick={() => setEditingMealId(null)}
                className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveMealEdit(editingMealId)}
                className="flex-[2] py-2 bg-violet-650 hover:bg-violet-700 text-xs font-bold text-white rounded-xl transition shadow-lg shadow-violet-500/15 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP: Add Consumed Meal Today Modal */}
      {showAddMealModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-sm w-full p-5 space-y-4 text-left animate-in zoom-in-95 duration-150 font-sans max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-800/80 pb-2.5">
              <span className="text-xs uppercase font-mono tracking-wider font-extrabold text-rose-500 flex items-center gap-1.5">
                <Flame className="w-4.5 h-4.5 text-rose-500 animate-pulse" />
                Add Meal/Snack Today
              </span>
              {/* Note: The 'x' button at the top right is not present, as requested. */}
            </div>

            <form 
              onSubmit={(e) => {
                handleAddMeal(e);
                if (mealName.trim()) {
                  setShowAddMealModal(false);
                }
              }} 
              className="space-y-4 text-xs"
            >
              <div className="relative" ref={suggestionRef}>
                <label className="text-[10px] text-slate-400 dark:text-slate-440 uppercase block mb-1 font-mono font-bold">Meal/Snack Description</label>
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
                  className="w-full px-3 py-2 text-xs bg-slate-50/60 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-300 focus:border-rose-500 text-slate-850 dark:text-slate-100 font-sans font-bold"
                  autoComplete="off"
                />

                {showSuggestions && matchingSuggestions.length > 0 && (
                  <div 
                    id="meal-autofill-suggestions"
                    className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 space-y-0.5 animate-in fade-in slide-in-from-top-2 duration-150"
                  >
                    <div className="flex items-center justify-between px-2.5 py-1 text-[9px] uppercase font-mono font-bold text-slate-450 border-b border-slate-100 dark:border-slate-800/50 pb-1.5 mb-1.5">
                      <span>Autofill Favorites</span>
                      <span className="bg-rose-500/10 text-rose-500 dark:text-rose-455 px-1.5 py-0.5 rounded-full text-[8px] font-mono leading-none">
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
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl transition block group space-y-1 cursor-pointer"
                      >
                        <span className="text-[11.5px] font-semibold text-slate-850 dark:text-slate-100 block group-hover:text-rose-500 transition-colors truncate">
                          {suggestion.name}
                        </span>
                        <div className="flex items-center justify-between gap-2 text-[9px] font-mono text-slate-400 dark:text-slate-500">
                          <span className="font-semibold text-slate-600 dark:text-slate-400">{suggestion.calories} kcal</span>
                          <span>P:{suggestion.protein || 0}g carb:{suggestion.carbs || 0}g</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] text-slate-400 dark:text-slate-440 uppercase block mb-1 font-mono font-bold">Energy (kcal)</label>
                <input
                  id="meal-calories"
                  type="number"
                  inputMode="numeric"
                  placeholder="420"
                  value={mealCalories}
                  onChange={(e) => setMealCalories(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-300 focus:border-rose-500 text-slate-850 dark:text-slate-100 font-sans font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/15 p-3 rounded-2xl">
                <div>
                  <label className="text-[9px] text-rose-600 dark:text-rose-455 uppercase block mb-1 font-mono font-bold truncate">Base Weight (g)</label>
                  <input
                    id="meal-ref-grams"
                    type="number"
                    inputMode="numeric"
                    placeholder="100"
                    value={mealRefGrams}
                    onChange={(e) => setMealRefGrams(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 font-mono text-center font-bold"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-rose-600 dark:text-rose-455 uppercase block mb-1 font-mono font-bold truncate">Consumed (g)</label>
                  <input
                    id="meal-consumed-grams"
                    type="number"
                    inputMode="numeric"
                    placeholder="100"
                    value={mealConsumedGrams}
                    onChange={(e) => setMealConsumedGrams(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 font-mono text-center font-bold"
                  />
                </div>
              </div>

              {(
                <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-950/80 border border-slate-150 dark:border-slate-800 rounded-2xl">
                  {/* Macros Group */}
                  <div className="space-y-1">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[8px] text-slate-400 dark:text-slate-440 uppercase block mb-0.5 font-mono font-bold leading-none">Protein (g)</label>
                        <input
                           type="number"
                           inputMode="decimal"
                           step="0.1"
                           placeholder="0"
                           value={protein}
                           onChange={(e) => setProtein(e.target.value)}
                           className="w-full p-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 font-mono text-center font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[8px] text-slate-400 dark:text-slate-440 uppercase block mb-0.5 font-mono font-bold leading-none">Carbs (g)</label>
                        <input
                           type="number"
                           inputMode="decimal"
                           step="0.1"
                           placeholder="0"
                           value={carbs}
                           onChange={(e) => setCarbs(e.target.value)}
                           className="w-full p-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 font-mono text-center font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[8px] text-slate-400 dark:text-slate-440 uppercase block mb-0.5 font-mono font-bold leading-none">Fat (g)</label>
                        <input
                           type="number"
                           inputMode="decimal"
                           step="0.1"
                           placeholder="0"
                           value={fat}
                           onChange={(e) => setFat(e.target.value)}
                           className="w-full p-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 font-mono text-center font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Micros Group */}
                  <div className="space-y-1 pt-2 border-t border-slate-200/50 dark:border-slate-800/50">
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <span className="text-[8px] uppercase font-mono text-slate-440 dark:text-slate-550 block mb-0.5 truncate font-bold">Sugar (g)</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.1"
                          placeholder="0"
                          value={sugar}
                          onChange={(e) => setSugar(e.target.value)}
                          className="w-full p-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-slate-800 dark:text-slate-100 font-mono text-center font-bold"
                        />
                      </div>
                      <div>
                        <span className="text-[8px] uppercase font-mono text-slate-440 dark:text-slate-550 block mb-0.5 truncate font-bold">Fiber (g)</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.1"
                          placeholder="0"
                          value={fiber}
                          onChange={(e) => setFiber(e.target.value)}
                          className="w-full p-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-slate-800 dark:text-slate-100 font-mono text-center font-bold"
                        />
                      </div>
                      <div>
                        <span className="text-[8px] uppercase font-mono text-slate-440 dark:text-slate-550 block mb-0.5 truncate font-mono font-bold">Na (mg)</span>
                        <input
                          type="number"
                          placeholder="0"
                          value={sodium}
                          onChange={(e) => setSodium(e.target.value)}
                          className="w-full p-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-slate-800 dark:text-slate-100 font-mono text-center font-bold"
                        />
                      </div>
                      <div>
                        <span className="text-[8px] uppercase font-mono text-slate-440 dark:text-slate-550 block mb-0.5 truncate font-mono font-bold">K (mg)</span>
                        <input
                          type="number"
                          placeholder="0"
                          value={potassium}
                          onChange={(e) => setPotassium(e.target.value)}
                          className="w-full p-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-slate-800 dark:text-slate-100 font-mono text-center font-bold"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMealModal(false)}
                  className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-705 dark:text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-2 bg-rose-500 hover:bg-rose-600 text-xs font-bold text-white rounded-xl transition shadow-lg shadow-rose-555/15 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Log Consumed Meal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
