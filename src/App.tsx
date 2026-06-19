import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Settings,
  Scale,
  Moon,
  Sun,
  Droplet,
  Flame,
  Activity,
  User,
  Heart,
  Smartphone,
  Expand,
  Clock,
  Home,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { DailyRecord, UserSettings } from './types';
import { Capacitor } from '@capacitor/core';
import { HealthConnectService } from './services/healthConnectService';
import {
  getTodayDateString,
  getPastWeekDates,
  getBlankDailyRecord,
  generateSampleData,
  formatDateLabel,
} from './utils/date';

import SleepWidget from './components/SleepWidget';
import DietWidget from './components/DietWidget';
import WaterWidget from './components/WaterWidget';
import WeightWidget from './components/WeightWidget';
import ExerciseWidget from './components/ExerciseWidget';
import WeeklyTrends from './components/WeeklyTrends';
import DataManagement from './components/DataManagement';
import ConsistencyCalendar from './components/ConsistencyCalendar';
import TimelineHistoryWidget from './components/TimelineHistoryWidget';
import ReflectionWidget from './components/ReflectionWidget';
import ReflectionJournal from './components/ReflectionJournal';

const DEFAULT_SETTINGS: UserSettings = {
  defaultGlassSizeMl: 250,
  targetWaterMl: 2000,
  targetSleepHours: 8,
  targetCalories: 2200,
  targetExerciseMinutes: 30,
  targetWeightKg: 70,
  targetExerciseDaysPerWeek: 4,
  heightCm: 175,
};

type AppTab = 'home' | 'exercise' | 'food' | 'profile';

export default function App() {
  const dateInputRef = useRef<HTMLInputElement>(null);

  // --- States ---
  const [records, setRecords] = useState<Record<string, DailyRecord>>({});
  const [activeDate, setActiveDate] = useState<string>('');
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [activeAppTab, setActiveAppTab] = useState<AppTab>('home');
  const isNativeAndroid = Capacitor.getPlatform() === 'android';
  const [isMobilePreviewFrame, setIsMobilePreviewFrame] = useState(() => {
    return !isNativeAndroid;
  });
  const [congratsType, setCongratsType] = useState<'water' | 'exercise' | null>(null);
  const [showOvereating, setShowOvereating] = useState<boolean>(false);
  const [overeatingCalories, setOvereatingCalories] = useState<number>(0);
  const [greeting, setGreeting] = useState('Welcome');
  const [currentTime, setCurrentTime] = useState('');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const stored = localStorage.getItem('serene_health_dark_theme');
    return stored === 'true';
  });

  // Health Connect Auto-sync states
  const [healthSyncMessage, setHealthSyncMessage] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncedSteps, setSyncedSteps] = useState<number>(() => {
    return Number(localStorage.getItem('serene_health_synced_steps') || '0');
  });
  const [syncedCalories, setSyncedCalories] = useState<number>(() => {
    return Number(localStorage.getItem('serene_health_synced_calories') || '0');
  });
  const [lastSyncedTime, setLastSyncedTime] = useState<string>(() => {
    return localStorage.getItem('serene_health_last_synced_time') || '';
  });

  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem('serene_health_dark_theme', String(next));
      return next;
    });
  };

  // --- Initialize offline DB & preferences ---
  useEffect(() => {
    const hrs = new Date().getHours();
    if (hrs < 12) setGreeting('Good morning');
    else if (hrs < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);

    const storedRecords = localStorage.getItem('serene_health_records');
    const storedSettings = localStorage.getItem('serene_health_settings');

    let currentRecords: Record<string, DailyRecord> = {};

    if (storedRecords) {
      try {
        currentRecords = JSON.parse(storedRecords);
      } catch (e) {
        console.error('Failed to parse stored health records', e);
      }
    }

    if (Object.keys(currentRecords).length === 0) {
      currentRecords = generateSampleData(
        storedSettings ? JSON.parse(storedSettings).defaultGlassSizeMl : DEFAULT_SETTINGS.defaultGlassSizeMl
      );
      localStorage.setItem('serene_health_records', JSON.stringify(currentRecords));
    }

    setRecords(currentRecords);

    const today = getTodayDateString();
    setActiveDate(today);

    if (storedSettings) {
      try {
        const parsed = JSON.parse(storedSettings);
        // Ensure defaults for new fields are backfilled smoothly if not present
        setSettings({
          ...DEFAULT_SETTINGS,
          ...parsed
        });
      } catch (e) {
        setSettings(DEFAULT_SETTINGS);
      }
    } else {
      localStorage.setItem('serene_health_settings', JSON.stringify(DEFAULT_SETTINGS));
    }

    return () => clearInterval(interval);
  }, []);

  // Sync state helpers
  const saveRecords = (updated: Record<string, DailyRecord>) => {
    setRecords(updated);
    localStorage.setItem('serene_health_records', JSON.stringify(updated));
  };

  const saveSettings = (updated: UserSettings) => {
    setSettings(updated);
    localStorage.setItem('serene_health_settings', JSON.stringify(updated));
  };

  const getActiveRecord = (): DailyRecord => {
    if (!activeDate) return getBlankDailyRecord(getTodayDateString(), settings.defaultGlassSizeMl);
    if (!records[activeDate]) {
      return getBlankDailyRecord(activeDate, settings.defaultGlassSizeMl);
    }
    return records[activeDate];
  };

  const updateActiveRecord = (updates: Partial<DailyRecord>) => {
    const current = getActiveRecord();
    const updatedRecord = {
      ...current,
      ...updates,
    };

    const newRecords = {
      ...records,
      [activeDate]: updatedRecord,
    };
    saveRecords(newRecords);
  };

  // Specific metric changes passed down
  const handleSleepChange = (updates: Partial<DailyRecord['sleep']>) => {
    const r = getActiveRecord();
    updateActiveRecord({
      sleep: { ...r.sleep, ...updates },
    });
  };

  const handleDietChange = (updates: Partial<DailyRecord['diet']>) => {
    const r = getActiveRecord();
    const oldCalories = r.diet.calories;
    const newCalories = (updates.calories !== undefined) ? updates.calories : oldCalories;

    const limitCal = settings.targetCalories * 1.1; // 10% more than target
    if (newCalories >= limitCal && newCalories > oldCalories) {
      setOvereatingCalories(newCalories);
      setShowOvereating(true);
    }

    updateActiveRecord({
      diet: { ...r.diet, ...updates },
    });
  };

  const handleWaterChange = (updates: Partial<DailyRecord['water']>) => {
    const r = getActiveRecord();
    const oldWater = r.water.totalMl;
    const newWater = (updates.totalMl !== undefined) ? updates.totalMl : oldWater;

    if (oldWater < settings.targetWaterMl && newWater >= settings.targetWaterMl) {
      setCongratsType('water');
    }

    updateActiveRecord({
      water: { ...r.water, ...updates },
    });
  };

  const handleWeightChange = (updates: Partial<DailyRecord['weight']>) => {
    const r = getActiveRecord();
    updateActiveRecord({
      weight: { ...r.weight, ...updates },
    });
  };

  const handleExerciseChange = (updates: Partial<DailyRecord['exercise']>) => {
    const r = getActiveRecord();
    const oldMinutes = r.exercise.durationMinutes;
    const newMinutes = (updates.durationMinutes !== undefined) ? updates.durationMinutes : oldMinutes;

    if (oldMinutes < settings.targetExerciseMinutes && newMinutes >= settings.targetExerciseMinutes) {
      setCongratsType('exercise');
    }

    updateActiveRecord({
      exercise: { ...r.exercise, ...updates },
    });
  };

  const handleClearReflection = (date: string) => {
    if (records[date]) {
      const updated = {
        ...records,
        [date]: {
          ...records[date],
          reflection: '',
        },
      };
      saveRecords(updated);
    }
  };

  // Health Connect Auto-Sync synchronization engine
  const syncHealthMetrics = async () => {
    if (!settings.enableHealthConnectAutoSync) return;

    setIsSyncing(true);
    try {
      const res = await HealthConnectService.syncTodayMetrics(activeDate);
      if (res.status.success && res.data) {
        setSyncedSteps(res.data.steps);
        setSyncedCalories(res.data.calories);
        const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastSyncedTime(timeNow);
        
        localStorage.setItem('serene_health_synced_steps', String(res.data.steps));
        localStorage.setItem('serene_health_synced_calories', String(res.data.calories));
        localStorage.setItem('serene_health_last_synced_time', timeNow);
      } else {
        if (Capacitor.getPlatform() !== 'android') {
          // Web preview simulator
          const baseSteps = 8240;
          const bounce = Math.floor(Math.sin(Date.now() / 15000) * 200) + Math.floor((Date.now() % 400) / 8);
          const simulatedSteps = baseSteps + bounce;
          const simulatedCalories = Math.round((simulatedSteps * 0.04) * 10) / 10;
          
          setSyncedSteps(simulatedSteps);
          setSyncedCalories(simulatedCalories);
          const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setLastSyncedTime(timeNow);
          
          localStorage.setItem('serene_health_synced_steps', String(simulatedSteps));
          localStorage.setItem('serene_health_synced_calories', String(simulatedCalories));
          localStorage.setItem('serene_health_last_synced_time', timeNow);
        }
      }
    } catch (e) {
      console.error('Failed to sync metrics', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleAutoSync = async () => {
    const nextVal = !settings.enableHealthConnectAutoSync;
    if (nextVal) {
      setHealthSyncMessage('Requesting Health Connect permissions...');
      try {
        const res = await HealthConnectService.ensurePermissions();
        if (res.success) {
          saveSettings({ ...settings, enableHealthConnectAutoSync: true });
          setHealthSyncMessage('Health Connect Auto-Sync is successfully enabled! Live syncing is active.');
          setTimeout(() => {
            syncHealthMetrics();
          }, 300);
        } else if (res.code === 'NOT_ANDROID') {
          // On Web previews, allow enabling simulator auto-sync
          saveSettings({ ...settings, enableHealthConnectAutoSync: true });
          setHealthSyncMessage('Web Simulator: Auto-sync is enabled. Mock sensor feeds are running.');
          setTimeout(() => {
            syncHealthMetrics();
          }, 300);
        } else {
          setHealthSyncMessage(`Sync not enabled: ${res.message}`);
        }
      } catch (error: any) {
        setHealthSyncMessage(`Inquiry failed: ${error?.message || 'Access error'}`);
      }
    } else {
      saveSettings({ ...settings, enableHealthConnectAutoSync: false });
      setHealthSyncMessage('');
    }
  };

  // Trigger auto sync when tab is selected or activeDate changes if enabled
  useEffect(() => {
    if (settings.enableHealthConnectAutoSync) {
      syncHealthMetrics();
      const interval = setInterval(() => {
        syncHealthMetrics();
      }, 10000); // sync every 10s
      return () => clearInterval(interval);
    }
  }, [settings.enableHealthConnectAutoSync, activeAppTab, activeDate]);

  // Profile actions
  const handleImportBackup = (newData: Record<string, DailyRecord>, newSettings?: UserSettings) => {
    saveRecords(newData);
    if (newSettings) {
      saveSettings(newSettings);
    }
    const keys = Object.keys(newData).sort();
    if (keys.length > 0) {
      setActiveDate(keys[keys.length - 1]);
    }
  };

  const handleClearAllData = () => {
    const empty: Record<string, DailyRecord> = {};
    const today = getTodayDateString();
    empty[today] = getBlankDailyRecord(today, settings.defaultGlassSizeMl);
    saveRecords(empty);
    setActiveDate(today);
  };

  const handleReloadSampleData = () => {
    const samples = generateSampleData(settings.defaultGlassSizeMl);
    saveRecords(samples);
    setActiveDate(getTodayDateString());
  };

  // Date controls
  const handlePrevDay = () => {
    if (!activeDate) return;
    const [year, month, day] = activeDate.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() - 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setActiveDate(`${yyyy}-${mm}-${dd}`);
  };

  const handleNextDay = () => {
    if (!activeDate) return;
    const todayStr = getTodayDateString();
    if (activeDate >= todayStr) return;

    const [year, month, day] = activeDate.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() + 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const nextString = `${yyyy}-${mm}-${dd}`;
    
    if (nextString <= todayStr) {
      setActiveDate(nextString);
    }
  };

  const getAssumedWeightForDate = (dateStr: string): number | null => {
    if (!dateStr) return null;
    if (records[dateStr]?.weight?.kg !== null && records[dateStr]?.weight?.kg !== undefined && records[dateStr]?.weight?.kg > 0) {
      return records[dateStr].weight.kg;
    }
    const datesWithWeight = Object.keys(records)
      .filter((d) => records[d]?.weight?.kg !== null && records[d]?.weight?.kg !== undefined && records[d]?.weight?.kg > 0)
      .sort();
    const pastDatesWithWeight = datesWithWeight.filter((d) => d < dateStr);
    if (pastDatesWithWeight.length > 0) {
      return records[pastDatesWithWeight[pastDatesWithWeight.length - 1]].weight.kg;
    }
    return null;
  };

  const currentRecord = getActiveRecord();
  const sleepProgress = Math.min((currentRecord.sleep.hours / settings.targetSleepHours) * 100, 100);
  const waterProgress = Math.min((currentRecord.water.totalMl / settings.targetWaterMl) * 100, 100);
  const exerciseProgress = Math.min((currentRecord.exercise.durationMinutes / settings.targetExerciseMinutes) * 100, 100);
  const dietProgress = Math.min((currentRecord.diet.calories / settings.targetCalories || 0) * 100, 100);

  const averageDailyScore = Math.round(
    (sleepProgress + waterProgress + exerciseProgress + (dietProgress > 100 ? 200 - dietProgress : dietProgress)) / 4
  );

  const getPastWeekDailyRecords = (): DailyRecord[] => {
    const pastDates = getPastWeekDates();
    return pastDates.map((d) => {
      if (records[d]) return records[d];
      return getBlankDailyRecord(d, settings.defaultGlassSizeMl);
    });
  };

  const weekRecords = getPastWeekDailyRecords();

  const bmiHeightM = (settings.heightCm || 175) / 100;
  const bmiCurrentWeight = currentRecord.weight.kg || getAssumedWeightForDate(activeDate);
  const calBmi = bmiCurrentWeight ? parseFloat((bmiCurrentWeight / (bmiHeightM * bmiHeightM)).toFixed(1)) : null;

  let bmiCategory = '';
  let bmiColorClass = '';
  let bmiBgLight = '';
  if (calBmi !== null) {
    if (calBmi < 18.5) {
      bmiCategory = 'Underweight';
      bmiColorClass = 'text-sky-500 dark:text-sky-400';
      bmiBgLight = 'bg-sky-50 dark:bg-sky-950/20 border-sky-100 dark:border-sky-900/50';
    } else if (calBmi < 25) {
      bmiCategory = 'Normal Weight';
      bmiColorClass = 'text-emerald-500 dark:text-emerald-400';
      bmiBgLight = 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-indigo-950/30';
    } else if (calBmi < 30) {
      bmiCategory = 'Overweight';
      bmiColorClass = 'text-amber-500 dark:text-amber-400';
      bmiBgLight = 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/40';
    } else {
      bmiCategory = 'Obese';
      bmiColorClass = 'text-rose-500 dark:text-rose-450';
      bmiBgLight = 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/40';
    }
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'} flex flex-col items-center justify-start ${isNativeAndroid ? 'p-0' : 'p-2 sm:p-6'} transition-all`}>
      
      {/* Visual Workspace Controller: smartphone simulator vs full fluid responsive width */}
      {!isNativeAndroid && (
        <div id="device-view-selector" className="mb-4 flex items-center gap-2 bg-white/80 dark:bg-slate-900/80 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm z-10 text-xs text-slate-500 dark:text-slate-400 font-medium font-sans">
          <span className="pl-2 font-mono text-slate-400 dark:text-slate-500">Viewport Layout:</span>
          <button
            id="toggle-view-mobile"
            type="button"
            onClick={() => setIsMobilePreviewFrame(true)}
            className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition ${
              isMobilePreviewFrame ? 'bg-indigo-50 dark:bg-indigo-950/55 text-indigo-600 dark:text-indigo-400 font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            Mobile Phone Frame
          </button>
          <button
            id="toggle-view-desktop"
            type="button"
            onClick={() => setIsMobilePreviewFrame(false)}
            className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition ${
              !isMobilePreviewFrame ? 'bg-indigo-50 dark:bg-indigo-950/55 text-indigo-600 dark:text-indigo-400 font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Expand className="w-3.5 h-3.5" />
            Fluid Fit Desktop
          </button>
        </div>
      )}

      {/* Frame wrapper */}
      <div
        id="app-viewport-wrapper"
        className={`w-full transition-all duration-500 relative flex flex-col ${
          isMobilePreviewFrame
            ? 'max-w-[430px] h-[880px] border-[10px] border-slate-800/90 dark:border-slate-800 rounded-[44px] shadow-nordic dark:shadow-none bg-slate-50 dark:bg-slate-900 sticky top-2 overflow-hidden'
            : (isNativeAndroid ? 'min-h-screen pb-24 w-full' : 'max-w-4xl pb-24')
        }`}
      >
        {/* Android status bar mock if in Mobile Mode (never shown on native Android) */}
        {isMobilePreviewFrame && !isNativeAndroid && (
          <div id="android-status-bar" className="bg-slate-100/90 dark:bg-slate-900/90 backdrop-blur px-6 py-2.5 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 sticky top-0 z-50 border-b border-slate-200/50 dark:border-slate-800/60 selection-none">
            <div className="flex items-center gap-1.5 select-none">
              <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <span>{currentTime || '12:00 PM'}</span>
            </div>
            <div className="flex items-center gap-1.5 select-none">
              <span>LTE</span>
              <div className="w-5 h-2.5 border border-slate-500 dark:border-slate-600 rounded-sm flex p-0.5 justify-start items-center">
                <div className="h-full w-[90%] bg-slate-500 dark:bg-slate-400 rounded-2xs" />
              </div>
            </div>
          </div>
        )}

        {/* Core application body */}
        <div
          id="app-body-container"
          className={`p-4 sm:p-6 space-y-6 flex-1 ${
            isMobilePreviewFrame
              ? 'overflow-y-auto scrollbar-none pb-24'
              : ''
          }`}
        >
          
          {/* Header */}
          <header className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-indigo-650 dark:text-indigo-400">
                <Heart className="w-4 h-4 fill-rose-500 text-rose-500 animate-pulse" />
                <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 dark:text-slate-500 font-extrabold block">Circadia</span>
              </div>
              <h1 className="text-xl font-sans font-extrabold tracking-tight text-slate-800 dark:text-slate-100 mt-0.5">
                {greeting}, Ravi
              </h1>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-sans">Your Health Companion</p>
            </div>

            {/* Light/Dark Toggle */}
            <button
              id="theme-mode-toggle"
              type="button"
              onClick={toggleTheme}
              className="p-2.5 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-all flex items-center justify-center shadow-subtle dark:shadow-none"
              title={isDarkMode ? 'Light view' : 'Dark view'}
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4 text-amber-400 fill-amber-300" />
              ) : (
                <Moon className="w-4 h-4 text-slate-500" />
              )}
            </button>
          </header>

          {/* Date Navigator (Persistent for calendar queries unless we're strictly on Profile) */}
          {activeAppTab !== 'profile' && (
            <div
              id="date-navigator"
              className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/90 p-3 rounded-2xl shadow-subtle dark:shadow-none selection-none"
            >
              <button
                id="prev-day-btn"
                type="button"
                onClick={handlePrevDay}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition"
                title="Previous Day"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div
                onClick={() => {
                  try {
                    dateInputRef.current?.showPicker();
                  } catch (e) {
                    console.warn('showPicker not supported or failed', e);
                  }
                }}
                className="relative hover:bg-slate-50 dark:hover:bg-slate-900/60 transition px-4 py-2 rounded-xl border border-transparent hover:border-slate-100 dark:hover:border-slate-800 flex flex-col items-center justify-center cursor-pointer group text-center min-w-[130px]"
              >
                <input
                  ref={dateInputRef}
                  type="date"
                  value={activeDate}
                  max={getTodayDateString()}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val && val <= getTodayDateString()) {
                      setActiveDate(val);
                    }
                  }}
                  className="absolute inset-0 opacity-0 pointer-events-none w-full h-full"
                  title="Choose a date"
                />
                <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 font-bold font-mono group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition">
                  <CalendarIcon className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                  <span>{activeDate}</span>
                </div>
                <span className="text-xs font-sans font-extrabold text-slate-700 dark:text-slate-200 mt-0.5">
                  {activeDate === getTodayDateString() ? 'Today' : formatDateLabel(activeDate)}
                </span>
              </div>

              <button
                id="next-day-btn"
                type="button"
                onClick={handleNextDay}
                disabled={activeDate >= getTodayDateString()}
                className="p-1.5 border border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:text-slate-300 dark:disabled:text-slate-600"
                title="Next Day"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* TAB CONTENTS RENDERS */}

          {/* TAB 1: HOME */}
          {activeAppTab === 'home' && (
            <div id="tab-home-content" className="space-y-6 animate-in fade-in duration-350">
              
              {/* Daily Vitality Progress Banner */}
              <div
                id="daily-progress-banner"
                className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 dark:border-slate-800 rounded-3xl p-5 text-white relative overflow-hidden"
              >
                <div className="absolute top-1/2 right-0 -translate-y-1/2 w-28 h-28 bg-emerald-500/10 blur-3xl rounded-full" />
                <div className="absolute top-0 left-1/3 w-16 h-16 bg-indigo-500/10 blur-2xl rounded-full" />

                <div className="relative">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-400 font-extrabold">
                    Day Performance
                  </span>
                  <div className="flex justify-between items-end mt-1.5">
                    <div>
                      <h3 className="text-lg font-sans font-black tracking-tight leading-snug">Ravi's Vitality Score</h3>
                      <p className="text-[10px] text-slate-300 mt-0.5">Weighted metrics</p>
                    </div>
                    <span className="text-3xl font-mono font-black tracking-tight text-emerald-400">
                      {averageDailyScore}%
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-slate-800">
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[8px] font-mono text-slate-400">
                        <span>Sleep</span>
                        <span>{Math.round(sleepProgress)}%</span>
                      </div>
                      <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-400" style={{ width: `${sleepProgress}%` }} />
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[8px] font-mono text-slate-400">
                        <span>Water</span>
                        <span>{Math.round(waterProgress)}%</span>
                      </div>
                      <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-sky-400" style={{ width: `${waterProgress}%` }} />
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[8px] font-mono text-slate-400">
                        <span>Exercise</span>
                        <span>{Math.round(exerciseProgress)}%</span>
                      </div>
                      <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-teal-400" style={{ width: `${exerciseProgress}%` }} />
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[8px] font-mono text-slate-400">
                        <span>Diet</span>
                        <span>{Math.round(dietProgress)}%</span>
                      </div>
                      <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-400" style={{ width: `${dietProgress}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Day At a Glance widgets */}
              <div id="day-at-a-glance-section" className="space-y-2">
                <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 dark:text-slate-500 font-extrabold">
                  Day At A Glance
                </span>
                
                <div className="grid grid-cols-2 gap-3">
                  {/* Calories Today */}
                  <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl flex flex-col justify-between whitespace-normal">
                    <div className="flex items-start justify-between">
                      <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 uppercase font-bold">Food Energy</span>
                      <Flame className="w-3.5 h-3.5 text-rose-500" />
                    </div>
                    <div className="mt-2 text-right">
                      <span className="text-sm font-sans font-black text-slate-700 dark:text-slate-100 block">
                        {currentRecord.diet.calories} kcal
                      </span>
                      <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 font-semibold text-rose-500 block">
                        Target: {settings.targetCalories} kcal
                      </span>
                    </div>
                  </div>

                  {/* Sleep Previously */}
                  <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl flex flex-col justify-between whitespace-normal">
                    <div className="flex items-start justify-between">
                      <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 uppercase font-bold">Sleep Quality</span>
                      <Moon className="w-3.5 h-3.5 text-indigo-500" />
                    </div>
                    <div className="mt-2 text-right">
                      <span className="text-sm font-sans font-black text-slate-700 dark:text-slate-100 block">
                        {currentRecord.sleep.hours} hrs
                      </span>
                      <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500">
                        Quality: {currentRecord.sleep.quality}/5
                      </span>
                    </div>
                  </div>

                  {/* Water Hydration */}
                  <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl flex flex-col justify-between whitespace-normal">
                    <div className="flex items-start justify-between">
                      <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 uppercase font-bold">Hydration</span>
                      <Droplet className="w-3.5 h-3.5 text-sky-500" />
                    </div>
                    <div className="mt-2 text-right">
                      <span className="text-sm font-sans font-black text-slate-700 dark:text-slate-100 block">
                        {currentRecord.water.totalMl} ml
                      </span>
                      <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500">
                        Target: {settings.targetWaterMl} ml
                      </span>
                    </div>
                  </div>

                  {/* Current weight */}
                  <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl flex flex-col justify-between whitespace-normal">
                    <div className="flex items-start justify-between">
                      <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 uppercase font-bold">Body Weight</span>
                      <Scale className="w-3.5 h-3.5 text-emerald-500" />
                    </div>
                    <div className="mt-2 text-right">
                      <span className="text-sm font-sans font-black text-slate-700 dark:text-slate-100 block">
                        {currentRecord.weight.kg ? `${currentRecord.weight.kg} kg` : (getAssumedWeightForDate(activeDate) ? `${getAssumedWeightForDate(activeDate)} kg` : '-- kg')}
                      </span>
                      <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500">
                        {currentRecord.weight.kg ? `Goal: ${settings.targetWeightKg ? `${settings.targetWeightKg} kg` : 'Unset'}` : (getAssumedWeightForDate(activeDate) ? 'Assumed weight' : `Goal: ${settings.targetWeightKg ? `${settings.targetWeightKg} kg` : 'Unset'}`)}
                      </span>
                    </div>
                  </div>

                  {/* Body Mass Index (BMI) Card */}
                  <div id="bmi-status-card" className="col-span-2 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl flex flex-col justify-between whitespace-normal shadow-subtle dark:shadow-none space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 uppercase font-extrabold tracking-wider">Body Mass Index (BMI)</span>
                      </div>
                      <div className="text-[9px] font-mono text-slate-400 dark:text-slate-500 font-medium">
                        Height: {settings.heightCm} cm
                      </div>
                    </div>

                    {calBmi !== null ? (
                      <div className="space-y-3">
                        <div className="flex items-baseline justify-between">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-xl font-sans font-black text-slate-700 dark:text-slate-100">
                              {calBmi}
                            </span>
                            <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500">
                              kg/m²
                            </span>
                          </div>
                          <span className={`text-[10px] font-sans font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full border ${bmiBgLight} ${bmiColorClass}`}>
                            {bmiCategory}
                          </span>
                        </div>

                        {/* Interactive Dynamic Multi-segment WHO Status Bar */}
                        <div className="space-y-1.5">
                          <div className="relative h-2 w-full rounded-full flex bg-slate-100 dark:bg-slate-800 overflow-visible">
                            {/* Segment 1: Underweight (< 18.5) (15 to 35 range scale) */}
                            <div className="h-full bg-sky-400/80 rounded-l-full" style={{ width: '17.5%' }} title="Underweight (< 18.5)" />
                            {/* Segment 2: Normal Weight (18.5 - 25.0) */}
                            <div className="h-full bg-emerald-500/80" style={{ width: '32.5%' }} title="Normal Weight (18.5 - 24.9)" />
                            {/* Segment 3: Overweight (25.0 - 30.0) */}
                            <div className="h-full bg-amber-500/80" style={{ width: '25%' }} title="Overweight (25.0 - 29.9)" />
                            {/* Segment 4: Obese (>= 30) */}
                            <div className="h-full bg-rose-500/80 rounded-r-full" style={{ width: '25%' }} title="Obese (>= 30.0)" />

                            {/* Pointer pin at computed point on range 15 to 35 */}
                            {(() => {
                              const pct = Math.min(100, Math.max(0, ((calBmi - 15) / 20) * 100));
                              return (
                                <div
                                  className="absolute top-1/2 -translate-y-1/2 -ml-1.5 w-3.5 h-3.5 rounded-full bg-white dark:bg-slate-900 border-2 border-slate-700 dark:border-slate-300 shadow-md transition-all duration-700"
                                  style={{ left: `${pct}%` }}
                                  title={`Current BMI: ${calBmi}`}
                                />
                              );
                            })()}
                          </div>

                          {/* Legend / Range labels */}
                          <div className="grid grid-cols-4 gap-1 text-[8px] font-mono text-center text-slate-400 dark:text-slate-500">
                            <div className="text-left font-semibold text-sky-500 dark:text-sky-400">
                              &lt;18.5 (Under)
                            </div>
                            <div className="font-semibold text-emerald-500 dark:text-emerald-400">
                              18.5 - 24.9 (Normal)
                            </div>
                            <div className="font-semibold text-amber-500 dark:text-amber-400">
                              25 - 29.9 (Over)
                            </div>
                            <div className="text-right font-semibold text-rose-500 dark:text-rose-500">
                              &ge;30 (Obese)
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="py-2.5 px-3 bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/80 rounded-xl text-center">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-semibold">
                          Weight is not recorded for this day
                        </span>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 block font-mono mt-0.5">
                          Log today's weight under the Exercise tab to see BMI tracking.
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Did Exercise or Not strip */}
                <div className={`p-3.5 border rounded-2xl flex items-center justify-between shadow-subtle dark:shadow-none bg-white dark:bg-slate-900 ${currentRecord.exercise.durationMinutes > 0 ? 'border-emerald-100 dark:border-emerald-950/40 bg-emerald-50/5 dark:bg-emerald-950/5' : 'border-slate-200 dark:border-slate-800'}`}>
                  <div className="flex items-center gap-2.5">
                    {currentRecord.exercise.durationMinutes > 0 ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-50 dark:fill-emerald-950/20" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-500" />
                    )}
                    <div>
                      <span className="text-[10px] font-mono font-bold uppercase block text-slate-400 dark:text-slate-500">Daily Exercise Goal</span>
                      <span className="text-xs font-sans font-bold text-slate-700 dark:text-slate-200 leading-tight">
                        {currentRecord.exercise.durationMinutes > 0
                          ? `Workout Completed: ${currentRecord.exercise.durationMinutes}m of ${currentRecord.exercise.type}`
                          : `No exercises logged for this date yet (Goal: ${settings.targetExerciseMinutes} mins)`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Daily Reflection Widget */}
              <ReflectionWidget
                reflection={currentRecord.reflection || ''}
                onSave={(val) => updateActiveRecord({ reflection: val })}
              />

              {/* Consistency calendar-type Widget */}
              <ConsistencyCalendar
                records={records}
                activeDate={activeDate}
                onSelectDate={setActiveDate}
                isDarkMode={isDarkMode}
              />

              {/* Weekly Trends charts (General display) */}
              <WeeklyTrends pastWeekRecords={weekRecords} isDarkMode={isDarkMode} isMobileFrame={isMobilePreviewFrame} />
            </div>
          )}

          {/* TAB 2: EXERCISE */}
          {activeAppTab === 'exercise' && (
            <div id="tab-exercise-content" className="space-y-6 animate-in fade-in duration-350">
              
              {/* Exercise Log */}
              <ExerciseWidget
                record={currentRecord.exercise}
                onChange={handleExerciseChange}
                targetMinutes={settings.targetExerciseMinutes}
                enableHealthConnectAutoSync={settings.enableHealthConnectAutoSync}
                isSyncing={isSyncing}
                syncedSteps={syncedSteps}
                syncedCalories={syncedCalories}
                lastSyncedTime={lastSyncedTime}
                onRefreshSync={syncHealthMetrics}
              />

              {/* Sleep Log */}
              <SleepWidget
                record={currentRecord.sleep}
                onChange={handleSleepChange}
                targetHours={settings.targetSleepHours}
              />

              {/* Body Weight Log */}
              <WeightWidget
                record={currentRecord.weight}
                onChange={handleWeightChange}
                assumedWeight={getAssumedWeightForDate(activeDate)}
              />

              {/* Detailed Trend charts focusing on sleep and body weight timelines */}
              <TimelineHistoryWidget
                metric="weight"
                records={records}
                targetValue={settings.targetWeightKg}
                isDarkMode={isDarkMode}
              />

              <TimelineHistoryWidget
                metric="sleep"
                records={records}
                targetValue={settings.targetSleepHours}
                isDarkMode={isDarkMode}
              />
            </div>
          )}

          {/* TAB 3: FOOD & HYDRATION */}
          {activeAppTab === 'food' && (
            <div id="tab-food-content" className="space-y-6 animate-in fade-in duration-350">
              <DietWidget
                record={currentRecord.diet}
                onChange={handleDietChange}
                targetCalories={settings.targetCalories}
                pastWeekRecords={weekRecords}
                waterRecord={currentRecord.water}
                onWaterChange={handleWaterChange}
                isDarkMode={isDarkMode}
                settings={settings}
              />
            </div>
          )}

          {/* TAB 4: PROFILE & CUSTOMIZATION */}
          {activeAppTab === 'profile' && (
            <div id="tab-profile-content" className="space-y-6 animate-in fade-in duration-350">
              
              {/* Profile card summary */}
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-5 text-white shadow-nordic dark:shadow-none flex items-center gap-4 relative overflow-hidden">
                <div className="absolute top-1/2 right-0 -translate-y-1/2 w-44 h-44 bg-white/10 blur-3xl rounded-full" />
                <div className="w-14 h-14 bg-white/20 border border-white/30 rounded-2xl flex items-center justify-center text-white text-xl font-bold font-mono">
                  RY
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight leading-snug">Ravi Yadav</h3>
                  <span className="text-[10px] font-mono text-indigo-100 uppercase tracking-widest block font-bold">Premium Member</span>
                </div>
              </div>

              {/* Customizable Goals and Targets Card */}
              <div className="bg-white/75 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/85 p-5 rounded-3xl shadow-subtle dark:shadow-none space-y-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
                    <Settings className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-sans font-bold text-slate-800 dark:text-slate-100">
                      Wellness Metric Goals
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5 text-xs text-slate-600 dark:text-slate-400 font-sans pt-1">
                  
                  {/* Calorie goal */}
                  <div>
                    <label className="block text-slate-400 dark:text-slate-500 font-mono text-[9px] uppercase mb-1 font-bold">
                      Energy target (kcal)
                    </label>
                    <input
                      id="profile-settings-calories"
                      type="number"
                      inputMode="numeric"
                      value={settings.targetCalories}
                      onChange={(e) => saveSettings({ ...settings, targetCalories: Number(e.target.value) || 2200 })}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-mono rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-300"
                    />
                  </div>

                  {/* Height (cm) */}
                  <div>
                    <label className="block text-slate-400 dark:text-slate-500 font-mono text-[9px] uppercase mb-1 font-bold">
                      Height (cm)
                    </label>
                    <input
                      id="profile-settings-height"
                      type="number"
                      inputMode="numeric"
                      value={settings.heightCm || ''}
                      placeholder="in cm"
                      onChange={(e) => saveSettings({ ...settings, heightCm: Number(e.target.value) || 175 })}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-mono rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-300"
                    />
                  </div>

                  {/* Weight goal */}
                  <div>
                    <label className="block text-slate-400 dark:text-slate-500 font-mono text-[9px] uppercase mb-1 font-bold">
                      Body weight Goal (kg)
                    </label>
                    <input
                      id="profile-settings-weight"
                      type="number"
                      inputMode="decimal"
                      value={settings.targetWeightKg || ''}
                      placeholder="in kg"
                      onChange={(e) => saveSettings({ ...settings, targetWeightKg: Number(e.target.value) || 70 })}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-mono rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-300"
                    />
                  </div>

                  {/* Sleep Goal */}
                  <div>
                    <label className="block text-slate-400 dark:text-slate-500 font-mono text-[9px] uppercase mb-1 font-bold">
                      Daily Sleep Goal (hrs)
                    </label>
                    <input
                      id="profile-settings-sleep"
                      type="number"
                      inputMode="decimal"
                      value={settings.targetSleepHours}
                      onChange={(e) => saveSettings({ ...settings, targetSleepHours: Number(e.target.value) || 8 })}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-mono rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-300"
                    />
                  </div>

                  {/* Weekly workout consistency goal */}
                  <div>
                    <label className="block text-slate-400 dark:text-slate-500 font-mono text-[9px] uppercase mb-1 font-bold">
                      Exercise Days/Week Goal
                    </label>
                    <input
                      id="profile-settings-exercise-days"
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max="7"
                      value={settings.targetExerciseDaysPerWeek || ''}
                      placeholder="no of days"
                      onChange={(e) => saveSettings({ ...settings, targetExerciseDaysPerWeek: Number(e.target.value) || 4 })}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-mono rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-300"
                    />
                  </div>

                  {/* Daily workout minutes */}
                  <div>
                    <label className="block text-slate-400 dark:text-slate-500 font-mono text-[9px] uppercase mb-1 font-bold">
                      Exercise Duration Goal (mins)
                    </label>
                    <input
                      id="profile-settings-exercise-duration"
                      type="number"
                      inputMode="numeric"
                      value={settings.targetExerciseMinutes}
                      onChange={(e) => saveSettings({ ...settings, targetExerciseMinutes: Number(e.target.value) || 30 })}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-mono rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-300"
                    />
                  </div>

                  {/* Water Target */}
                  <div>
                    <label className="block text-slate-400 dark:text-slate-500 font-mono text-[9px] uppercase mb-1 font-bold">
                      Daily Water Goal (ml)
                    </label>
                    <input
                      id="profile-settings-water"
                      type="number"
                      step="250"
                      inputMode="numeric"
                      value={settings.targetWaterMl}
                      onChange={(e) => saveSettings({ ...settings, targetWaterMl: Number(e.target.value) || 2000 })}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-mono rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-300"
                    />
                  </div>

                  {/* Default glass size */}
                  <div className="col-span-2">
                    <label className="block text-slate-400 dark:text-slate-500 font-mono text-[9px] uppercase mb-1.5 font-bold">
                      Default Glass Capacity
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[250, 500, 750].map((size) => {
                        const active = settings.defaultGlassSizeMl === size;
                        return (
                          <button
                            id={`profile-glass-size-${size}`}
                            key={size}
                            type="button"
                            onClick={() => saveSettings({ ...settings, defaultGlassSizeMl: size })}
                            className={`py-1.5 px-3 rounded-xl border text-xs font-semibold font-mono transition ${
                              active
                                ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-850 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs'
                                : 'bg-slate-50/50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            {size} ml
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </div>
              </div>

              {/* Integrations Section */}
              <div className="bg-white/75 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/85 p-5 rounded-3xl shadow-subtle dark:shadow-none space-y-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-teal-50 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900/50 text-teal-600 dark:text-teal-400 rounded-xl">
                    <Smartphone className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-sans font-bold text-slate-800 dark:text-slate-100">
                      Wearable & Direct Integrations
                    </h3>
                  </div>
                </div>

                <div className="space-y-4 pt-1">
                  <div className="flex items-center justify-between p-3.5 bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/80 rounded-2xl">
                    <div className="space-y-1 pr-4">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
                        Enable Health Connect Auto-Sync
                      </span>
                      <span className="text-[10px] text-slate-450 dark:text-slate-500 leading-relaxed block">
                        Automatically sync walking and jogging steps and calories directly from Android Health Connect sensors safely and privately.
                      </span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                      <input
                        id="toggle-health-connect-sync"
                        type="checkbox"
                        checked={!!settings.enableHealthConnectAutoSync}
                        onChange={handleToggleAutoSync}
                        className="sr-only peer"
                      />
                      <div className="w-[42px] h-[24px] bg-slate-200 dark:bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:border-slate-600 peer-checked:bg-teal-500" />
                    </label>
                  </div>

                  {healthSyncMessage && (
                    <div className="flex items-start gap-2 p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 rounded-2xl text-[10px] text-indigo-600 dark:text-indigo-400">
                      <Sparkles className="w-4 h-4 shrink-0" />
                      <span className="font-medium leading-relaxed">{healthSyncMessage}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Daily Reflections Journal Format Toggle */}
              <ReflectionJournal
                records={records}
                onClearReflection={handleClearReflection}
              />

              {/* Data Import, Export and management options */}
              <DataManagement
                allRecords={records}
                onImport={handleImportBackup}
                onClear={handleClearAllData}
                onResetSample={handleReloadSampleData}
                settings={settings}
              />
            </div>
          )}

        </div>

        {/* STICKY BOTTOM TABS SELECTOR BAR - Fits exactly inside smartphone screen, responsive globally */}
        <nav
          id="app-bottom-tab-bar"
          className={`sticky bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800/90 py-3.5 px-6 flex justify-around items-center z-40 shadow-[0_-8px_24px_rgba(15,23,42,0.02)] selection-none ${
            isMobilePreviewFrame ? 'rounded-b-[34px]' : (isNativeAndroid ? 'rounded-none' : 'lg:rounded-2xl')
          }`}
        >
          {/* Home button */}
          <button
            id="tab-btn-home"
            type="button"
            onClick={() => setActiveAppTab('home')}
            className={`flex flex-col items-center gap-1 text-center transition ${
              activeAppTab === 'home'
                ? 'text-indigo-500 dark:text-indigo-400 font-bold scale-105'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400'
            }`}
          >
            <Home className="w-5 h-5 text-slate-405 dark:text-slate-400" />
            <span className="text-[10px] tracking-tight">Home</span>
          </button>

          {/* Exercise button */}
          <button
            id="tab-btn-exercise"
            type="button"
            onClick={() => setActiveAppTab('exercise')}
            className={`flex flex-col items-center gap-1 text-center transition ${
              activeAppTab === 'exercise'
                ? 'text-teal-500 dark:text-teal-400 font-bold scale-105'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400'
            }`}
          >
            <Activity className="w-5 h-5 text-slate-405 dark:text-slate-400" />
            <span className="text-[10px] tracking-tight">Exercise</span>
          </button>

          {/* Food button */}
          <button
            id="tab-btn-food"
            type="button"
            onClick={() => setActiveAppTab('food')}
            className={`flex flex-col items-center gap-1 text-center transition ${
              activeAppTab === 'food'
                ? 'text-rose-500 dark:text-rose-400 font-bold scale-105'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400'
            }`}
          >
            <Flame className="w-5 h-5 text-slate-405 dark:text-slate-400" />
            <span className="text-[10px] tracking-tight">Food</span>
          </button>

          {/* Profile button */}
          <button
            id="tab-btn-profile"
            type="button"
            onClick={() => setActiveAppTab('profile')}
            className={`flex flex-col items-center gap-1 text-center transition ${
              activeAppTab === 'profile'
                ? 'text-indigo-500 dark:text-indigo-400 font-bold scale-105'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400'
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] tracking-tight">Profile</span>
          </button>
        </nav>

        {/* Portal root for modals and overlays to escape local container stacking contexts */}
        <div id="modal-portal-root" />

        {/* Congratulations Popup Overlay */}
        <AnimatePresence>
          {congratsType && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                className="w-full max-w-[320px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-2xl dark:shadow-none relative overflow-hidden flex flex-col items-center text-center space-y-4"
              >
                {/* Decorative Sparkles background */}
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
                
                <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/40 rounded-full flex items-center justify-center border border-emerald-100 dark:border-emerald-900/50 mt-2 text-emerald-500">
                  {congratsType === 'water' ? (
                    <Droplet className="w-7 h-7 text-sky-500 animate-bounce" />
                  ) : (
                    <Activity className="w-7 h-7 text-emerald-500 animate-bounce" />
                  )}
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-base font-black text-slate-800 dark:text-slate-100 tracking-tight">
                    Target Achieved! 🎉
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed px-1">
                    {congratsType === 'water' ? (
                      <>Amazing hydration today! You've met your daily water target of <strong className="text-slate-700 dark:text-slate-200">{settings.targetWaterMl}ml</strong>. Keep up the brilliant work!</>
                    ) : (
                      <>Incredible job! You've reached your daily exercise target of <strong className="text-slate-700 dark:text-slate-200">{settings.targetExerciseMinutes} minutes</strong>. Your body is thanking you!</>
                    )}
                  </p>
                </div>

                <button
                  id="btn-congrats-close"
                  type="button"
                  onClick={() => setCongratsType(null)}
                  className="w-full py-2.5 px-4 bg-slate-900 dark:bg-slate-50 hover:bg-slate-850 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-xs font-semibold rounded-2xl transition duration-205 shadow-md-light dark:shadow-none"
                >
                  Awesome, keep it up!
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Overeating Alert Overlay */}
        <AnimatePresence>
          {showOvereating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                className="w-full max-w-[320px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-2xl dark:shadow-none relative overflow-hidden flex flex-col items-center text-center space-y-4"
              >
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 to-rose-500" />
                
                <div className="w-14 h-14 bg-amber-50 dark:bg-amber-950/40 rounded-full flex items-center justify-center border border-amber-100 dark:border-amber-900/50 mt-2 text-amber-500">
                  <Flame className="w-7 h-7 text-amber-500 animate-pulse" />
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-base font-black text-slate-800 dark:text-slate-100 tracking-tight">
                    Calorie Target Exceeded! ⚠️
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed px-1">
                    You have consumed <strong className="text-amber-600 dark:text-amber-400">{overeatingCalories} kcal</strong>, which is over 10% more than your healthy target limit of <strong className="text-slate-700 dark:text-slate-200">{settings.targetCalories} kcal</strong>.
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 italic mt-1 leading-relaxed">
                    Stop overeating and practice mindful nutrition. Giving your digestion a timely rest supports long-term wellness!
                  </p>
                </div>

                <button
                  id="btn-overeating-close"
                  type="button"
                  onClick={() => setShowOvereating(false)}
                  className="w-full py-2.5 px-4 bg-slate-900 dark:bg-slate-50 hover:bg-slate-850 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-xs font-semibold rounded-2xl transition duration-205 shadow-md-light dark:shadow-none"
                >
                  I'm finished eating today
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
