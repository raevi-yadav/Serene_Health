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
  AlertCircle,
  Bell,
  BellRing
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
import { triggerHaptic } from './utils/haptic';

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

  // Wellness Metrics popup/inline editing temporary state managers
  const [user, setUser] = useState<{ email: string; name: string; photoURL: string } | null>(() => {
    const saved = localStorage.getItem('serene_health_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  
  // Daily notification reminders state
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [isNightlyReminderEnabled, setIsNightlyReminderEnabled] = useState(() => {
    const saved = localStorage.getItem('serene_nightly_reminder');
    return saved !== 'disabled';
  });
  const [isMorningReminderEnabled, setIsMorningReminderEnabled] = useState(() => {
    const saved = localStorage.getItem('serene_morning_reminder');
    return saved !== 'disabled';
  });
  const [notificationsList, setNotificationsList] = useState<{ id: string; title: string; text: string; time: string; read: boolean }[]>([]);
  const [activeToast, setActiveToast] = useState<{ title: string; text: string; type: string } | null>(null);

  // Background check for 11:00 PM and 7:00 AM everyday reminders
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const hrs = now.getHours();
      const mins = now.getMinutes();

      // Lock duplicate alerts on the same date
      const dateStringKey = now.toISOString().split('T')[0];

      // Nightly Log Alert (11:00 PM -> hrs === 23 && mins === 0)
      if (hrs === 23 && mins === 0 && isNightlyReminderEnabled) {
        const nightLock = localStorage.getItem(`night_alert_fired_${dateStringKey}`);
        if (!nightLock) {
          localStorage.setItem(`night_alert_fired_${dateStringKey}`, 'true');
          const title = "Nightly Logger Reminder 🌙";
          const text = "Time to log your food intake and workouts of today to maintain your active month streak!";
          setActiveToast({ title, text, type: 'night' });
          setNotificationsList(prev => [
            { id: Date.now().toString(), title, text, time: '11:00 PM', read: false },
            ...prev
          ]);
          triggerHaptic([30, 20, 30]);
        }
      }

      // Morning Sleep tracker alarm (7:00 AM -> hrs === 7 && mins === 0)
      if (hrs === 7 && mins === 0 && isMorningReminderEnabled) {
        const morningLock = localStorage.getItem(`morning_alert_fired_${dateStringKey}`);
        if (!morningLock) {
          localStorage.setItem(`morning_alert_fired_${dateStringKey}`, 'true');
          const title = "Sunrise Sleep Logger ☀️";
          const text = "Wake up! Log your sleep and wake timings to track your restful hours.";
          setActiveToast({ title, text, type: 'morning' });
          setNotificationsList(prev => [
            { id: Date.now().toString(), title, text, time: '7:00 AM', read: false },
            ...prev
          ]);
          triggerHaptic([30, 20, 30]);
        }
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [isNightlyReminderEnabled, isMorningReminderEnabled]);

  // Timed dismiss for Active Toast Alert
  useEffect(() => {
    if (activeToast) {
      const timer = setTimeout(() => {
        setActiveToast(null);
      }, 7500);
      return () => clearTimeout(timer);
    }
  }, [activeToast]);

  const simulateNightlyFired = () => {
    triggerHaptic([20, 15, 20]);
    const title = "Nightly Logger Reminder 🌙";
    const text = "Time to log your food intake and workouts of today to maintain your active month streak!";
    setActiveToast({ title, text, type: 'night' });
    setNotificationsList(prev => [
      { id: Date.now().toString(), title, text, time: '11:00 PM (Test Log)', read: false },
      ...prev
    ]);
  };

  const simulateMorningFired = () => {
    triggerHaptic([20, 15, 20]);
    const title = "Sunrise Sleep Logger ☀️";
    const text = "Wake up! Log your sleep and wake timings to track your restful hours.";
    setActiveToast({ title, text, type: 'morning' });
    setNotificationsList(prev => [
      { id: Date.now().toString(), title, text, time: '7:00 AM (Test Log)', read: false },
      ...prev
    ]);
  };
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);
  const [profileTargetCalories, setProfileTargetCalories] = useState<number>(DEFAULT_SETTINGS.targetCalories);
  const [profileHeightCm, setProfileHeightCm] = useState<number>(DEFAULT_SETTINGS.heightCm);
  const [profileTargetWeightKg, setProfileTargetWeightKg] = useState<number>(DEFAULT_SETTINGS.targetWeightKg);
  const [profileTargetSleepHours, setProfileTargetSleepHours] = useState<number>(DEFAULT_SETTINGS.targetSleepHours);
  const [profileTargetExerciseDaysPerWeek, setProfileTargetExerciseDaysPerWeek] = useState<number>(DEFAULT_SETTINGS.targetExerciseDaysPerWeek);
  const [profileTargetExerciseMinutes, setProfileTargetExerciseMinutes] = useState<number>(DEFAULT_SETTINGS.targetExerciseMinutes);
  const [profileTargetWaterMl, setProfileTargetWaterMl] = useState<number>(DEFAULT_SETTINGS.targetWaterMl);
  const [profileDefaultGlassSizeMl, setProfileDefaultGlassSizeMl] = useState<number>(DEFAULT_SETTINGS.defaultGlassSizeMl);

  const startProfileEditing = () => {
    setProfileTargetCalories(settings.targetCalories);
    setProfileHeightCm(settings.heightCm || 175);
    setProfileTargetWeightKg(settings.targetWeightKg || 70);
    setProfileTargetSleepHours(settings.targetSleepHours);
    setProfileTargetExerciseDaysPerWeek(settings.targetExerciseDaysPerWeek || 4);
    setProfileTargetExerciseMinutes(settings.targetExerciseMinutes);
    setProfileTargetWaterMl(settings.targetWaterMl || 2000);
    setProfileDefaultGlassSizeMl(settings.defaultGlassSizeMl || 250);
    setIsEditingProfile(true);
  };

  const handleSaveProfileSettings = () => {
    saveSettings({
      ...settings,
      targetCalories: profileTargetCalories,
      heightCm: profileHeightCm,
      targetWeightKg: profileTargetWeightKg,
      targetSleepHours: profileTargetSleepHours,
      targetExerciseDaysPerWeek: profileTargetExerciseDaysPerWeek,
      targetExerciseMinutes: profileTargetExerciseMinutes,
      targetWaterMl: profileTargetWaterMl,
      defaultGlassSizeMl: profileDefaultGlassSizeMl,
    });
    setIsEditingProfile(false);
  };

  const handleCancelProfileEditing = () => {
    setIsEditingProfile(false);
  };
  const isNativeAndroid = Capacitor.getPlatform() === 'android';
  const [isMobileOrTabletScreen, setIsMobileOrTabletScreen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024 || isNativeAndroid;
    }
    return isNativeAndroid;
  });
  const [isMobilePreviewFrame, setIsMobilePreviewFrame] = useState(() => {
    if (isNativeAndroid || (typeof window !== 'undefined' && window.innerWidth < 1024)) {
      return false;
    }
    return true;
  });

  // Dynamic window resizing synchronization for responsive mobile-friendly layouts
  useEffect(() => {
    const handleResize = () => {
      const isMobileSize = window.innerWidth < 1024;
      setIsMobileOrTabletScreen(isMobileSize || isNativeAndroid);
      if (isMobileSize || isNativeAndroid) {
        setIsMobilePreviewFrame(false);
      }
    };
    handleResize(); // run on initial mount
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isNativeAndroid]);
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

  // 1. Calculate historical completion progress scores for day strip capsules
  const getDayProgress = (dateStr: string) => {
    const r = records[dateStr];
    if (!r) return 0;
    const sProg = Math.min(((r.sleep?.hours || 0) / settings.targetSleepHours) * 100, 100);
    const wProg = Math.min(((r.water?.totalMl || 0) / settings.targetWaterMl) * 100, 100);
    const eProg = Math.min(((r.exercise?.durationMinutes || 0) / settings.targetExerciseMinutes) * 100, 100);
    const dProg = Math.min(((r.diet?.calories || 0) / settings.targetCalories || 0) * 100, 100);
    const adjustedDiet = dProg > 100 ? 200 - dProg : dProg;
    return Math.round((sProg + wProg + eProg + adjustedDiet) / 4);
  };

  // 2. Compute a rolling 7-day strip centered on activeDate (capped at today)
  // Compute a rolling 7-day strip perfectly centered on activeDate
  const getHorizontalStripDates = () => {
    if (!activeDate) return [];
    const [year, month, day] = activeDate.split('-').map(Number);
    
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(year, month - 1, day);
      // Fixed -3 offset always keeps the selected day dead-center
      d.setDate(d.getDate() + (-3 + i)); 
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      dates.push(`${yyyy}-${mm}-${dd}`);
    }
    return dates;
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
    <div className={`min-h-screen ${isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'} flex flex-col items-center justify-start ${isNativeAndroid || isMobileOrTabletScreen ? 'p-0' : 'p-2 sm:p-6'} transition-all`}>
      
      {/* Visual Workspace Controller: smartphone simulator vs full fluid responsive width */}
      {!isNativeAndroid && !isMobileOrTabletScreen && (
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
            : (isNativeAndroid || isMobileOrTabletScreen ? 'min-h-screen pb-24 w-full bg-slate-50 dark:bg-slate-900' : 'max-w-4xl pb-24')
        }`}
      >
        {/* Android status bar mock if in Mobile Mode (never shown on native Android) */}
        {isMobilePreviewFrame && !isNativeAndroid && !isMobileOrTabletScreen && (
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
                <h1 className="text-xl font-sans font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
                  {greeting}, {user ? user.name.split(' ')[0] : 'Guest'}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Light/Dark Toggle */}
              <button
                id="theme-mode-toggle"
                type="button"
                onClick={toggleTheme}
                className="p-2.5 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-550 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-all flex items-center justify-center shadow-subtle dark:shadow-none"
                title={isDarkMode ? 'Light view' : 'Dark view'}
              >
                {isDarkMode ? (
                  <Sun className="w-4 h-4 text-amber-400 fill-amber-300" />
                ) : (
                  <Moon className="w-4 h-4 text-slate-500" />
                )}
              </button>
            </div>
          </header>

          {/* Modern Premium Horizontal Day Strip Navigator */}
          {activeAppTab !== 'profile' && (
            <div
              id="date-navigator"
              className="flex flex-col gap-3.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/90 p-4 rounded-3xl shadow-subtle dark:shadow-none selection-none"
            >
              {/* Top Row Header Metadata Indicator */}
              <div className="flex items-center justify-between px-1">
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase font-mono tracking-widest text-slate-400 dark:text-slate-500 font-black">
                    Timeline Monitor
                  </span>
                  <span className="text-sm font-sans font-black text-slate-800 dark:text-slate-100 mt-0.5">
                    {(() => {
                      if (!activeDate) return '';
                      const [y, m, d] = activeDate.split('-').map(Number);
                      return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
                    })()}
                  </span>
                </div>
                
                {/* Micro Toolbar buttons */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePrevDay}
                    className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition"
                    title="Previous Day"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      try {
                        dateInputRef.current?.showPicker();
                      } catch (e) {
                        console.warn('Fallback invocation failure', e);
                      }
                    }}
                    className="p-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850 text-indigo-500 dark:text-indigo-400 rounded-xl border border-slate-200/60 dark:border-slate-800/80 transition flex items-center justify-center gap-1.5"
                  >
                    <CalendarIcon className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-sans font-black uppercase tracking-wide hidden sm:inline">Picker</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleNextDay}
                    disabled={activeDate >= getTodayDateString()}
                    className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition disabled:opacity-20"
                    title="Next Day"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Hidden input anchor reference used to support standard calendar sheet trigger popup overlays */}
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
                className="absolute opacity-0 pointer-events-none w-0 h-0"
              />

              {/* Rolling Day Pill Grid */}
              <div className="grid grid-cols-7 gap-1.5 pt-0.5">
                {getHorizontalStripDates().map((dateStr) => {
                  const isSelected = dateStr === activeDate;
                  const isToday = dateStr === getTodayDateString();
                  const isFuture = dateStr > getTodayDateString(); // Beautifully flag future dates
                  
                  const [y, m, dNum] = dateStr.split('-').map(Number);
                  const dObj = new Date(y, m - 1, dNum);
                  const weekday = dObj.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 3);
                  const progressScore = getDayProgress(dateStr);

                  return (
                    <button
                      key={dateStr}
                      type="button"
                      disabled={isFuture} // Locks future days from being clickable
                      onClick={() => {
                        triggerHaptic([12]);
                        setActiveDate(dateStr);
                      }}
                      className={`flex flex-col items-center justify-between py-2 rounded-2xl transition-all relative select-none ${
                        isSelected
                          ? 'bg-gradient-to-b from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-500/20 scale-[1.02] z-10'
                          : isFuture
                          ? 'bg-slate-50/20 dark:bg-slate-950/10 text-slate-300 dark:text-slate-700 opacity-40 cursor-not-allowed'
                          : 'bg-slate-50/60 hover:bg-slate-100/80 dark:bg-slate-950/40 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400 cursor-pointer group'
                      }`}
                    >
                      {/* Weekday tag */}
                      <span className={`text-[9px] font-black font-sans uppercase tracking-tight ${
                        isSelected ? 'text-indigo-200' : 'text-slate-400 dark:text-slate-500'
                      }`}>
                        {weekday}
                      </span>

                      {/* Numeric Day label */}
                      <span className={`text-sm font-sans font-black tracking-tight mt-0.5 ${
                        isSelected ? 'text-white' : 'text-slate-800 dark:text-slate-200 group-hover:text-indigo-500'
                      }`}>
                        {dNum}
                      </span>

                      {/* Fitness Progress Indicator Mini-Capsule */}
                      <div className="mt-1.5 flex items-center justify-center w-full px-2">
                        {isSelected ? (
                          <div className="w-1.5 h-1.5 bg-white rounded-full" />
                        ) : isFuture ? (
                          /* Subtle empty indicator for unreached days */
                          <div className="w-1.5 h-1.5 bg-transparent border border-dashed border-slate-200 dark:border-slate-800 rounded-full" />
                        ) : (
                          <div 
                            className={`w-4 h-1 rounded-full transition-all ${
                              progressScore >= 80 
                                ? 'bg-emerald-500 dark:bg-emerald-400' 
                                : progressScore >= 40 
                                ? 'bg-amber-500' 
                                : progressScore > 0 
                                ? 'bg-rose-400' 
                                : 'bg-slate-200 dark:bg-slate-800'
                            }`}
                            title={`Score: ${progressScore}%`}
                          />
                        )}
                      </div>

                      {/* Today notification dot */}
                      {isToday && !isSelected && (
                        <div className="absolute top-1 right-1 w-1 h-1 bg-indigo-500 dark:bg-indigo-400 rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB CONTENTS RENDERS */}

          {/* TAB 1: HOME */}
          {activeAppTab === 'home' && (
            <div id="tab-home-content" className="space-y-6 animate-in fade-in duration-350">

              {/* Day At a Glance widgets */}
              <div id="day-at-a-glance-section" className="space-y-2">
              <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 dark:text-slate-500 font-extrabold">
                Day At A Glance
              </span>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Food Energy Card */}
                {(() => {
                  const calories = currentRecord?.diet?.calories || 0;
                  const target = settings?.targetCalories || 2000;
                  const pct = Math.min(100, Math.max(0, (calories / target) * 100));
                  return (
                    <div className="p-3.5 pb-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl flex flex-col justify-between relative overflow-hidden h-[100px] whitespace-normal">
                      <div className="flex items-start justify-between">
                        <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 uppercase font-bold">Food Energy</span>
                        <Flame className="w-3.5 h-3.5 text-rose-500" />
                      </div>
                      <div className="mt-2 text-right">
                        <span className="text-sm font-sans font-black text-slate-700 dark:text-slate-100 block">
                          {calories} kcal
                        </span>
                        <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 font-semibold block">
                          Target: {target} kcal
                        </span>
                      </div>
                      {/* Progress Bar Track */}
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100 dark:bg-slate-800/60">
                        <div 
                          className="h-full bg-gradient-to-r from-rose-500 to-orange-500 rounded-r-full transition-all duration-500" 
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })()}

                {/* Sleep Quality Card */}
                {(() => {
                  const hours = currentRecord?.sleep?.hours || 0;
                  const quality = currentRecord?.sleep?.quality || 0;
                  // Map out max quality score scale (e.g., 5 points max scale is 100%)
                  const pct = Math.min(100, Math.max(0, (quality / 5) * 100));
                  return (
                    <div className="p-3.5 pb-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl flex flex-col justify-between relative overflow-hidden h-[100px] whitespace-normal">
                      <div className="flex items-start justify-between">
                        <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 uppercase font-bold">Sleep Quality</span>
                        <Moon className="w-3.5 h-3.5 text-indigo-500" />
                      </div>
                      <div className="mt-2 text-right">
                        <span className="text-sm font-sans font-black text-slate-700 dark:text-slate-100 block">
                          {hours} hrs
                        </span>
                        <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 block">
                          Quality: {quality}/5
                        </span>
                      </div>
                      {/* Progress Bar Track */}
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100 dark:bg-slate-800/60">
                        <div 
                          className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-r-full transition-all duration-500" 
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })()}

                {/* Hydration Card */}
                {(() => {
                  const waterMl = currentRecord?.water?.totalMl || 0;
                  const targetMl = settings?.targetWaterMl || 2000;
                  const pct = Math.min(100, Math.max(0, (waterMl / targetMl) * 100));
                  return (
                    <div className="p-3.5 pb-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl flex flex-col justify-between relative overflow-hidden h-[100px] whitespace-normal">
                      <div className="flex items-start justify-between">
                        <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 uppercase font-bold">Hydration</span>
                        <Droplet className="w-3.5 h-3.5 text-sky-500" />
                      </div>
                      <div className="mt-2 text-right">
                        <span className="text-sm font-sans font-black text-slate-700 dark:text-slate-100 block">
                          {waterMl} ml
                        </span>
                        <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 block">
                          Target: {targetMl} ml
                        </span>
                      </div>
                      {/* Progress Bar Track */}
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100 dark:bg-slate-800/60">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-sky-400 rounded-r-full transition-all duration-500" 
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })()}

                {/* Body Weight Card */}
                {(() => {
                  const currentWeight = currentRecord?.weight?.kg || getAssumedWeightForDate(activeDate) || 0;
                  const targetWeight = settings?.targetWeightKg || 0;
                  // For body weight, if a target is present, render baseline target deviation factor proximity layout tracking 
                  const pct = targetWeight > 0 ? Math.min(100, Math.max(0, (targetWeight / currentWeight) * 100)) : 0;
                  return (
                    <div className="p-3.5 pb-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl flex flex-col justify-between relative overflow-hidden h-[100px] whitespace-normal">
                      <div className="flex items-start justify-between">
                        <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 uppercase font-bold">Body Weight</span>
                        <Scale className="w-3.5 h-3.5 text-emerald-500" />
                      </div>
                      <div className="mt-2 text-right">
                        <span className="text-sm font-sans font-black text-slate-700 dark:text-slate-100 block">
                          {currentRecord?.weight?.kg ? `${currentRecord.weight.kg} kg` : (getAssumedWeightForDate(activeDate) ? `${getAssumedWeightForDate(activeDate)} kg` : '-- kg')}
                        </span>
                        <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 block truncate">
                          {currentRecord?.weight?.kg ? `Goal: ${targetWeight ? `${targetWeight} kg` : 'Unset'}` : (getAssumedWeightForDate(activeDate) ? 'Assumed weight' : `Goal: ${targetWeight ? `${targetWeight} kg` : 'Unset'}`)}
                        </span>
                      </div>
                      {/* Progress Bar Track */}
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100 dark:bg-slate-800/60">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-r-full transition-all duration-500" 
                          style={{ width: targetWeight > 0 ? `${pct}%` : '0%' }}
                        />
                      </div>
                    </div>
                  );
                })()}

                {/* Exercise Done Card */}
                {(() => {
                  const duration = currentRecord?.exercise?.durationMinutes || 0;
                  const targetMinutes = settings?.targetExerciseMinutes || 30;
                  const pct = Math.min(100, Math.max(0, (duration / targetMinutes) * 100));
                  return (
                    <div className="p-3.5 pb-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl flex flex-col justify-between relative overflow-hidden h-[100px] whitespace-normal">
                      <div className="flex items-start justify-between">
                        <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 uppercase font-bold">Exercise Done</span>
                        <Activity className="w-3.5 h-3.5 text-teal-500" />
                      </div>
                      <div className="mt-2 text-right">
                        <span className="text-sm font-sans font-black text-slate-700 dark:text-slate-100 block">
                          {duration} mins
                        </span>
                        <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 block truncate">
                          {duration > 0 
                            ? `${currentRecord.exercise.type} (${currentRecord.exercise.intensity})`
                            : `Goal: ${targetMinutes} mins`}
                        </span>
                      </div>
                      {/* Progress Bar Track */}
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100 dark:bg-slate-800/60">
                        <div 
                          className="h-full bg-gradient-to-r from-teal-500 to-cyan-400 rounded-r-full transition-all duration-500" 
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })()}

                {/* Body Mass Index (BMI) Card */}
                <div id="bmi-status-card" className="col-span-2 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl flex flex-col justify-between whitespace-normal shadow-subtle dark:shadow-none space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 uppercase font-extrabold tracking-wider">Body Mass Index (BMI)</span>
                    </div>
                    <div className="text-[9px] font-mono text-slate-400 dark:text-slate-500 font-medium">
                      Height: {settings?.heightCm} cm
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
                          {/* Segment 1: Underweight (< 18.5) */}
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
                settings={settings}
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
                user={user}
                onRequestLogin={() => setIsLoginModalOpen(true)}
              />
            </div>
          )}

          {/* TAB 4: PROFILE & CUSTOMIZATION */}
          {activeAppTab === 'profile' && (
            <div id="tab-profile-content" className="space-y-6 animate-in fade-in duration-350">
              
              {/* Profile card summary */}
              {user ? (
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-5 text-white shadow-nordic dark:shadow-none flex items-center justify-between gap-4 relative overflow-hidden">
                  <div className="absolute top-1/2 right-0 -translate-y-1/2 w-44 h-44 bg-white/10 blur-3xl rounded-full" />
                  <div className="flex items-center gap-4 z-10">
                    <div className="w-14 h-14 bg-white/20 border border-white/30 rounded-2xl flex items-center justify-center text-white text-xl font-bold font-mono">
                      {user.name.split(' ').map((n: string) => n[0]).join('')}
                    </div>
                    <div>
                      <h3 className="text-base font-black tracking-tight leading-snug">{user.name}</h3>
                      <span className="text-[10px] font-mono text-indigo-100 uppercase tracking-widest block font-bold">Premium Member</span>
                      <span className="block text-[9px] font-mono tracking-tight text-indigo-200 mt-0.5">{user.email}</span>
                    </div>
                  </div>
                  <button
                    id="btn-profile-signout"
                    type="button"
                    onClick={() => {
                      localStorage.removeItem('serene_health_user');
                      setUser(null);
                      triggerHaptic(15);
                    }}
                    className="z-10 px-3.5 py-2 bg-red-500 hover:bg-red-650 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-red-500/10 active:scale-95 shrink-0"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-5 text-white shadow-nordic dark:shadow-none flex items-center justify-between gap-4 relative overflow-hidden">
                  <div className="absolute top-1/2 right-0 -translate-y-1/2 w-44 h-44 bg-white/10 blur-3xl rounded-full" />
                  <div className="flex items-center gap-4 z-10">
                    <div className="w-14 h-14 bg-white/20 border border-white/30 rounded-2xl flex items-center justify-center text-white text-xl font-bold font-mono">
                      G
                    </div>
                    <div>
                      <h3 className="text-base font-black tracking-tight leading-snug">Guest User</h3>
                      <span className="text-[10px] font-mono text-indigo-100 uppercase tracking-widest block font-bold">Standard Member</span>
                    </div>
                  </div>
                  <button
                    id="btn-profile-signin"
                    type="button"
                    onClick={() => {
                      setIsLoginModalOpen(true);
                      triggerHaptic(20);
                    }}
                    className="z-10 px-4 py-2 bg-white text-indigo-600 hover:bg-indigo-50 rounded-2xl text-xs font-black transition-all cursor-pointer shadow-md active:scale-95 shrink-0"
                  >
                    Sign In
                  </button>
                </div>
              )}

              {/* Logging Reminders & Notifications Card */}
              <div id="tab-profile-notifications-card" className="bg-white/75 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/85 p-5 rounded-3xl shadow-subtle dark:shadow-none space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
                      <Bell className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-sans font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        Logging Reminders & Alerts
                        {notificationsList.some(n => !n.read) && (
                          <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse" />
                        )}
                      </h3>
                    </div>
                  </div>
                  {notificationsList.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setNotificationsList([]);
                        triggerHaptic(10);
                      }}
                      className="text-[10px] uppercase font-mono tracking-tight text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer font-extrabold"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {/* Reminders schedule configurator lists */}
                <div className="space-y-3 pt-1">
                  <div className="text-[9px] uppercase font-mono tracking-widest text-slate-400 dark:text-slate-500 font-extrabold block">
                    Reminders Schedule (Daily)
                  </div>

                  {/* Nightly Logger Toggle */}
                  <div className="flex items-center justify-between bg-slate-50/55 dark:bg-slate-800/30 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/60 font-sans">
                    <div className="text-left flex-1 pr-2">
                      <span className="block text-[11px] font-extrabold text-slate-750 dark:text-slate-300 leading-tight">Food & Exercise Tracker</span>
                      <span className="block text-[9px] font-mono tracking-tight text-slate-402 dark:text-slate-500 mt-1">Daily reminder at 11:00 PM</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const nextState = !isNightlyReminderEnabled;
                        setIsNightlyReminderEnabled(nextState);
                        localStorage.setItem('serene_nightly_reminder', nextState ? 'enabled' : 'disabled');
                        triggerHaptic(12);
                      }}
                      className={`w-[42px] h-[24px] rounded-full transition relative shrink-0 ${isNightlyReminderEnabled ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-800'}`}
                    >
                      <span className={`absolute top-[2px] w-5 h-5 rounded-full bg-white shadow-sm transition-all ${isNightlyReminderEnabled ? 'right-[2px]' : 'left-[2px]'}`} />
                    </button>
                  </div>

                  {/* Sleep morning reminder toggle */}
                  <div className="flex items-center justify-between bg-slate-50/55 dark:bg-slate-800/30 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/60 font-sans">
                    <div className="text-left flex-1 pr-2">
                      <span className="block text-[11px] font-extrabold text-slate-755 dark:text-slate-300 leading-tight">Sleep & Wake Tracker</span>
                      <span className="block text-[9px] font-mono tracking-tight text-slate-402 dark:text-slate-500 mt-1">Daily reminder at 07:00 AM</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const nextState = !isMorningReminderEnabled;
                        setIsMorningReminderEnabled(nextState);
                        localStorage.setItem('serene_morning_reminder', nextState ? 'enabled' : 'disabled');
                        triggerHaptic(12);
                      }}
                      className={`w-[42px] h-[24px] rounded-full transition relative shrink-0 ${isMorningReminderEnabled ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-800'}`}
                    >
                      <span className={`absolute top-[2px] w-5 h-5 rounded-full bg-white shadow-sm transition-all ${isMorningReminderEnabled ? 'right-[2px]' : 'left-[2px]'}`} />
                    </button>
                  </div>
                </div>

                {/* Test simulator panel */}
                <div className="space-y-2 pt-3 border-t border-slate-101 dark:border-slate-805">
                  <div className="text-[9px] uppercase font-mono tracking-widest text-slate-400 dark:text-slate-500 font-extrabold block mb-1">
                    Run Test Simulator
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        simulateNightlyFired();
                        triggerHaptic(15);
                      }}
                      className="py-2.5 px-3 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-650 dark:text-indigo-400 text-[10px] font-extrabold rounded-xl text-center cursor-pointer transition"
                    >
                      Trigger 11 PM
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        simulateMorningFired();
                        triggerHaptic(15);
                      }}
                      className="py-2.5 px-3 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-650 dark:text-indigo-400 text-[10px] font-extrabold rounded-xl text-center cursor-pointer transition"
                    >
                      Trigger 7 AM
                    </button>
                  </div>
                </div>

                {/* Fired alerts log list */}
                <div className="space-y-2 pt-3 border-t border-slate-101 dark:border-slate-805 font-sans">
                  <div className="text-[9px] uppercase font-mono tracking-widest text-slate-400 dark:text-slate-500 font-extrabold block">
                    Fired Notification Alerts
                  </div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 scrollbar-none">
                    {notificationsList.length === 0 ? (
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 italic text-center py-3">
                        No logging alerts fired yet.
                      </p>
                    ) : (
                      notificationsList.map(n => (
                        <div key={n.id} className="text-left bg-slate-50/70 dark:bg-slate-900/50 p-2.5 rounded-xl text-[10px] leading-tight space-y-0.5 border border-slate-100 dark:border-slate-800/80">
                          <div className="flex items-center justify-between font-bold">
                            <span className="text-slate-750 dark:text-slate-300">{n.title}</span>
                            <span className="text-[8px] font-mono text-slate-404 dark:text-slate-500">{n.time}</span>
                          </div>
                          <p className="text-slate-500 dark:text-slate-400 text-[9px] leading-relaxed">{n.text}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Customizable Goals and Targets Card */}
              <div className="bg-white/75 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/85 p-5 rounded-3xl shadow-subtle dark:shadow-none space-y-4">
                <div className="flex items-center justify-between">
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

                  {/* Header action controllers */}
                  {!isEditingProfile ? (
                    <button
                      id="edit-profile-metrics-btn"
                      type="button"
                      onClick={startProfileEditing}
                      className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/55 border border-indigo-100 dark:border-indigo-900/55 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-450 transition-all cursor-pointer active:scale-95 duration-100"
                    >
                      Edit Goals
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        id="cancel-profile-metrics-btn"
                        type="button"
                        onClick={handleCancelProfileEditing}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-705 border border-slate-200 dark:border-slate-700/60 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        id="save-profile-metrics-btn"
                        type="button"
                        onClick={handleSaveProfileSettings}
                        className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-emerald-500/10"
                      >
                        Save
                      </button>
                    </div>
                  )}
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
                      value={isEditingProfile ? profileTargetCalories : settings.targetCalories}
                      readOnly={!isEditingProfile}
                      onChange={(e) => setProfileTargetCalories(Number(e.target.value) || 0)}
                      className={`w-full px-3 py-2 border font-mono rounded-xl focus:outline-none transition-all ${
                        isEditingProfile 
                          ? 'bg-white dark:bg-slate-950 border-indigo-200 dark:border-indigo-900 ring-1 ring-indigo-50 dark:ring-indigo-950/20 text-slate-800 dark:text-slate-100 font-bold' 
                          : 'bg-slate-100/50 dark:bg-slate-900 border-transparent text-slate-500 dark:text-slate-400 cursor-not-allowed select-none opacity-85'
                      }`}
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
                      value={isEditingProfile ? profileHeightCm : (settings.heightCm || '')}
                      readOnly={!isEditingProfile}
                      placeholder="in cm"
                      onChange={(e) => setProfileHeightCm(Number(e.target.value) || 0)}
                      className={`w-full px-3 py-2 border font-mono rounded-xl focus:outline-none transition-all ${
                        isEditingProfile 
                          ? 'bg-white dark:bg-slate-950 border-indigo-200 dark:border-indigo-900 ring-1 ring-indigo-50 dark:ring-indigo-950/20 text-slate-800 dark:text-slate-100 font-bold' 
                          : 'bg-slate-100/50 dark:bg-slate-900 border-transparent text-slate-500 dark:text-slate-400 cursor-not-allowed select-none opacity-85'
                      }`}
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
                      value={isEditingProfile ? profileTargetWeightKg : (settings.targetWeightKg || '')}
                      readOnly={!isEditingProfile}
                      placeholder="in kg"
                      onChange={(e) => setProfileTargetWeightKg(Number(e.target.value) || 0)}
                      className={`w-full px-3 py-2 border font-mono rounded-xl focus:outline-none transition-all ${
                        isEditingProfile 
                          ? 'bg-white dark:bg-slate-950 border-indigo-200 dark:border-indigo-900 ring-1 ring-indigo-50 dark:ring-indigo-950/20 text-slate-800 dark:text-slate-100 font-bold' 
                          : 'bg-slate-100/50 dark:bg-slate-900 border-transparent text-slate-500 dark:text-slate-400 cursor-not-allowed select-none opacity-85'
                      }`}
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
                      value={isEditingProfile ? profileTargetSleepHours : settings.targetSleepHours}
                      readOnly={!isEditingProfile}
                      onChange={(e) => setProfileTargetSleepHours(Number(e.target.value) || 0)}
                      className={`w-full px-3 py-2 border font-mono rounded-xl focus:outline-none transition-all ${
                        isEditingProfile 
                          ? 'bg-white dark:bg-slate-950 border-indigo-200 dark:border-indigo-900 ring-1 ring-indigo-50 dark:ring-indigo-950/20 text-slate-800 dark:text-slate-100 font-bold' 
                          : 'bg-slate-100/50 dark:bg-slate-900 border-transparent text-slate-500 dark:text-slate-400 cursor-not-allowed select-none opacity-85'
                      }`}
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
                      value={isEditingProfile ? profileTargetExerciseDaysPerWeek : (settings.targetExerciseDaysPerWeek || '')}
                      readOnly={!isEditingProfile}
                      placeholder="no of days"
                      onChange={(e) => setProfileTargetExerciseDaysPerWeek(Number(e.target.value) || 0)}
                      className={`w-full px-3 py-2 border font-mono rounded-xl focus:outline-none transition-all ${
                        isEditingProfile 
                          ? 'bg-white dark:bg-slate-950 border-indigo-200 dark:border-indigo-900 ring-1 ring-indigo-50 dark:ring-indigo-950/20 text-slate-800 dark:text-slate-100 font-bold' 
                          : 'bg-slate-100/50 dark:bg-slate-900 border-transparent text-slate-500 dark:text-slate-400 cursor-not-allowed select-none opacity-85'
                      }`}
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
                      value={isEditingProfile ? profileTargetExerciseMinutes : settings.targetExerciseMinutes}
                      readOnly={!isEditingProfile}
                      onChange={(e) => setProfileTargetExerciseMinutes(Number(e.target.value) || 0)}
                      className={`w-full px-3 py-2 border font-mono rounded-xl focus:outline-none transition-all ${
                        isEditingProfile 
                          ? 'bg-white dark:bg-slate-950 border-indigo-200 dark:border-indigo-900 ring-1 ring-indigo-50 dark:ring-indigo-950/20 text-slate-800 dark:text-slate-100 font-bold' 
                          : 'bg-slate-100/50 dark:bg-slate-900 border-transparent text-slate-500 dark:text-slate-400 cursor-not-allowed select-none opacity-85'
                      }`}
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
                      value={isEditingProfile ? profileTargetWaterMl : settings.targetWaterMl}
                      readOnly={!isEditingProfile}
                      onChange={(e) => setProfileTargetWaterMl(Number(e.target.value) || 0)}
                      className={`w-full px-3 py-2 border font-mono rounded-xl focus:outline-none transition-all ${
                        isEditingProfile 
                          ? 'bg-white dark:bg-slate-950 border-indigo-200 dark:border-indigo-900 ring-1 ring-indigo-50 dark:ring-indigo-950/20 text-slate-800 dark:text-slate-100 font-bold' 
                          : 'bg-slate-100/50 dark:bg-slate-900 border-transparent text-slate-500 dark:text-slate-400 cursor-not-allowed select-none opacity-85'
                      }`}
                    />
                  </div>

                  {/* Default glass size */}
                  <div className="col-span-2">
                    <label className="block text-slate-400 dark:text-slate-500 font-mono text-[9px] uppercase mb-1.5 font-bold">
                      Default Glass Capacity
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[250, 500, 750].map((size) => {
                        const currentSize = isEditingProfile ? profileDefaultGlassSizeMl : settings.defaultGlassSizeMl;
                        const active = currentSize === size;
                        return (
                          <button
                            id={`profile-glass-size-${size}`}
                            key={size}
                            type="button"
                            disabled={!isEditingProfile}
                            onClick={() => setProfileDefaultGlassSizeMl(size)}
                            className={`py-1.5 px-3 rounded-xl border text-xs font-semibold font-mono transition ${
                              active
                                ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs'
                                : 'bg-slate-50/50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-450 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                            } ${!isEditingProfile ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
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
          className={`${
            isMobilePreviewFrame 
              ? 'sticky bottom-0' 
              : 'fixed bottom-0 left-0 right-0 mx-auto ' + (isNativeAndroid || isMobileOrTabletScreen ? 'w-full max-w-none' : 'max-w-4xl')
          } bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800/90 py-3.5 px-6 flex justify-around items-center z-40 shadow-[0_-8px_24px_rgba(15,23,42,0.02)] selection-none ${
            isMobilePreviewFrame ? 'rounded-b-[34px]' : (isNativeAndroid || isMobileOrTabletScreen ? 'rounded-none' : 'lg:rounded-t-2xl shadow-[0_-12px_40px_rgba(15,23,42,0.06)]')
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

          {/* Profile button */}
          <button
            id="tab-btn-profile"
            type="button"
            onClick={() => {
              setActiveAppTab('profile');
              setNotificationsList(prev => prev.map(n => ({ ...n, read: true })));
            }}
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
              className={`${
                isMobilePreviewFrame ? 'absolute' : 'fixed'
              } inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans`}
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
              className={`${
                isMobilePreviewFrame ? 'absolute' : 'fixed'
              } inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans`}
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

        {/* Google Login popup Modal */}
        <AnimatePresence>
          {isLoginModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`${
                isMobilePreviewFrame ? 'absolute' : 'fixed'
              } inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans`}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                className="w-full max-w-[360px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col space-y-4 text-center"
              >
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 to-blue-500" />
                
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Sparkles className="w-5 h-5 text-indigo-500" />
                    Google Account
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsLoginModalOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-400 dark:text-slate-500 transition cursor-pointer text-lg font-bold"
                  >
                    &times;
                  </button>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed text-center py-1">
                  Connect your Google Account to unlock high-fidelity high-speed Gemini AI scanning.
                </p>

                {user ? (
                  <div className="space-y-3 bg-slate-50 dark:bg-slate-950/40 p-4 border border-slate-100 dark:border-slate-800 rounded-2xl">
                    <div className="flex items-center gap-3 justify-center">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white font-extrabold flex items-center justify-center shrink-0 shadow-sm">
                        {user.name.split(' ').map((n: string) => n[0]).join('')}
                      </div>
                      <div className="text-left font-sans">
                        <span className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 leading-none">{user.name}</span>
                        <span className="block text-[10px] text-slate-400 dark:text-slate-500 mt-1">{user.email}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.removeItem('serene_health_user');
                        setUser(null);
                        setIsLoginModalOpen(false);
                        triggerHaptic(15);
                      }}
                      className="w-full py-2 bg-red-500/10 hover:bg-red-500/15 text-red-650 dark:text-red-400 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {/* Standard Google sign in simulator buttons */}
                    <button
                      type="button"
                      onClick={() => {
                        const guestUser = {
                          email: 'yadavravi.work@gmail.com',
                          name: 'Ravi Yadav',
                          photoURL: ''
                        };
                        localStorage.setItem('serene_health_user', JSON.stringify(guestUser));
                        setUser(guestUser);
                        setIsLoginModalOpen(false);
                        triggerHaptic(20);
                      }}
                      className="w-full py-2.5 px-4 bg-slate-900 border border-slate-900 hover:bg-slate-850 dark:bg-white dark:border-white dark:hover:bg-slate-100 text-white dark:text-slate-950 rounded-2xl text-xs font-extrabold transition flex items-center justify-center gap-2 shadow cursor-pointer"
                    >
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22-.19-.63z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                      </svg>
                      Sign In as Ravi Yadav
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const mockUser = {
                          email: 'guest.explorer@gmail.com',
                          name: 'Guest Explorer',
                          photoURL: ''
                        };
                        localStorage.setItem('serene_health_user', JSON.stringify(mockUser));
                        setUser(mockUser);
                        setIsLoginModalOpen(false);
                        triggerHaptic(20);
                      }}
                      className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-extrabold transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22-.19-.63z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                      </svg>
                      Sign In as Guest
                    </button>
                  </div>
                )}
                
                <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 text-center uppercase tracking-wider">
                  Secure OAuth Simulated Framework
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Real-time Toast Notifications */}
        <AnimatePresence>
          {activeToast && (
            <motion.div
              initial={{ opacity: 0, y: -50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className={`${
                isMobilePreviewFrame ? 'absolute' : 'fixed'
              } top-4 inset-x-4 z-[9999] flex justify-center pointer-events-none font-sans`}
            >
              <div className="bg-slate-900/95 dark:bg-white text-white dark:text-slate-900 border border-slate-800 dark:border-slate-100/50 px-4.5 py-3.5 rounded-2xl shadow-2xl flex items-start gap-3 pointer-events-auto max-w-sm">
                <div className="p-1.5 bg-indigo-500 rounded-xl text-white shrink-0 mt-0.5">
                  <Bell className="w-4.5 h-4.5 animate-bounce" />
                </div>
                <div className="text-left flex-1 font-sans">
                  <span className="block text-xs font-black tracking-tight leading-none text-indigo-400 dark:text-indigo-650 block mb-1">
                    {activeToast.title}
                  </span>
                  <p className="text-[11px] font-bold opacity-90 leading-snug">
                    {activeToast.text}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveToast(null)}
                  className="text-slate-400 hover:text-white dark:text-slate-500 dark:hover:text-slate-800 text-sm font-bold pl-1 shrink-0 cursor-pointer"
                >
                  &times;
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
