import { useState, useEffect, useRef } from 'react';
import { Activity, Play, Pause, RotateCcw, Plus, Check, ChevronDown } from 'lucide-react';
import { ExerciseRecord, ExerciseIntensity } from '../types';
import MetricCard from './MetricCard';
import { triggerHaptic } from '../utils/haptic';

interface ExerciseWidgetProps {
  record: ExerciseRecord;
  onChange: (updates: Partial<ExerciseRecord>) => void;
  targetMinutes: number;
  enableHealthConnectAutoSync?: boolean;
  isSyncing?: boolean;
  syncedSteps?: number;
  syncedCalories?: number;
  lastSyncedTime?: string;
  onRefreshSync?: () => void;
}

export default function ExerciseWidget({
  record,
  onChange,
  targetMinutes,
  enableHealthConnectAutoSync,
  isSyncing,
  syncedSteps,
  syncedCalories,
  lastSyncedTime,
  onRefreshSync
}: ExerciseWidgetProps) {
  // Timer State
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Dropdown UI states
  const [workoutDropdownOpen, setWorkoutDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setWorkoutDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timerRunning]);

  const handleStartPause = () => {
    triggerHaptic(15);
    setTimerRunning((prev) => !prev);
  };

  const handleReset = () => {
    triggerHaptic([20, 20]);
    setTimerRunning(false);
    setTimerSeconds(0);
  };

  const handleCommitTimer = () => {
    triggerHaptic([30, 20, 30]);
    const activeMinutes = Math.floor(timerSeconds / 60);
    if (activeMinutes > 0) {
      onChange({ durationMinutes: record.durationMinutes + activeMinutes });
      setTimerSeconds(0);
      setTimerRunning(false);
    } else {
      // If it's less than a minute, just add 1 minute as visual progress or notify
      onChange({ durationMinutes: record.durationMinutes + 1 });
      setTimerSeconds(0);
      setTimerRunning(false);
    }
  };

  const formatTimerValue = () => {
    const hrs = Math.floor(timerSeconds / 3600);
    const mins = Math.floor((timerSeconds % 3600) / 60);
    const secs = timerSeconds % 60;
    return `${hrs > 0 ? `${hrs}:` : ''}${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const exerciseTypes = ['Cardio', 'Strength', 'Yoga', 'Walking', 'Sport', 'Flexibility'];
  const intensities: ExerciseIntensity[] = ['Low', 'Medium', 'High'];

  const quickAdd = (mins: number) => {
    triggerHaptic(15);
    onChange({ durationMinutes: record.durationMinutes + mins });
  };

  const percentage = Math.min(Math.round((record.durationMinutes / targetMinutes) * 100), 100);

  return (
    <MetricCard
      id="exercise-metric"
      title="Physical Activity"
      icon={<Activity className="w-5 h-5" />}
      value={`${record.durationMinutes}m`}
      subtitle={`/ ${targetMinutes}m goal`}
      accentColor="text-teal-500"
    >
      <div className="space-y-4">
        {/* Progress Tracker */}
        <div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              id="exercise-progress"
              className="bg-teal-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-tight font-mono">
            <span>{percentage}% of daily goal</span>
            <span>{targetMinutes - record.durationMinutes > 0 ? `${targetMinutes - record.durationMinutes} min left` : 'Goal met'}</span>
          </div>
        </div>

        {/* Direct log edit */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="relative" ref={dropdownRef}>
            <label className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Workout Type</label>
            <button
              id="exercise-type-dropdown-btn"
              type="button"
              onClick={() => {
                triggerHaptic(10);
                setWorkoutDropdownOpen(!workoutDropdownOpen);
              }}
              className="flex items-center justify-between w-full p-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-100/50 focus:border-teal-400 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:border-slate-350 dark:hover:border-slate-700 transition font-medium"
            >
              <span>{record.type}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${workoutDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {workoutDropdownOpen && (
              <div 
                id="exercise-type-dropdown-menu"
                className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl max-h-48 overflow-y-auto p-1 space-y-0.5 animate-in fade-in slide-in-from-top-2 duration-150"
              >
                {exerciseTypes.map((type) => {
                  const isSelected = record.type === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        triggerHaptic(12);
                        onChange({ type });
                        setWorkoutDropdownOpen(false);
                      }}
                      className={`flex items-center justify-between w-full px-3 py-1.5 text-xs rounded-xl text-left transition-all ${
                        isSelected
                          ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 font-bold'
                          : 'text-slate-650 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <span>{type}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div>
            <label className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Intensity</label>
            <div className="grid grid-cols-3 gap-1">
              {intensities.map((level) => {
                const active = record.intensity === level;
                return (
                  <button
                    id={`exercise-intensity-${level}`}
                    key={level}
                    type="button"
                    onClick={() => {
                      triggerHaptic(10);
                      onChange({ intensity: level });
                    }}
                    className={`py-2 text-[10px] font-medium rounded-xl border text-center transition-all ${
                      active
                        ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-850 text-teal-600 dark:text-teal-400 font-bold'
                        : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {level}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Quick log increment and input */}
        <div className="grid grid-cols-3 gap-1.5 pt-1">
          <button
            id="exercise-add-10"
            type="button"
            onClick={() => quickAdd(10)}
            className="py-1.5 px-2 bg-slate-50 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-lg text-xs font-semibold font-mono text-slate-600 dark:text-slate-350 transition"
          >
            +10m
          </button>
          <button
            id="exercise-add-30"
            type="button"
            onClick={() => quickAdd(30)}
            className="py-1.5 px-2 bg-slate-50 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-lg text-xs font-semibold font-mono text-slate-600 dark:text-slate-350 transition"
          >
            +30m
          </button>
          <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-800">
            <input
              id="exercise-direct-input"
              type="number"
              inputMode="numeric"
              min="0"
              placeholder="0"
              value={record.durationMinutes || ''}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 0;
                onChange({ durationMinutes: val });
              }}
              className="w-full text-center py-1 text-xs font-semibold select-all font-mono focus:outline-none text-slate-800 dark:text-slate-100 bg-transparent"
            />
            <span className="text-[10px] text-slate-400 dark:text-slate-500 pr-1.5 font-sans">m</span>
          </div>
        </div>

        {/* Health Connect Sync Status Card */}
        {enableHealthConnectAutoSync && (
          <div className="bg-gradient-to-r from-emerald-500/5 to-teal-500/5 dark:from-emerald-950/10 dark:to-teal-950/10 border border-emerald-100/60 dark:border-emerald-900/30 rounded-2xl p-3.5 space-y-2.5 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 ${isSyncing ? 'duration-500' : ''}`}></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Health Connect Synced
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {isSyncing ? (
                  <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 animate-pulse">Syncing...</span>
                ) : (
                  <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500">
                    {lastSyncedTime ? `Updated ${lastSyncedTime}` : 'Active'}
                  </span>
                )}
                {onRefreshSync && (
                  <button
                    type="button"
                    onClick={onRefreshSync}
                    disabled={isSyncing}
                    className={`text-slate-400 hover:text-teal-500 transition-colors p-0.5 rounded ${isSyncing ? 'animate-spin' : ''}`}
                    title="Manual Refresh"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                      <path d="M3 3v5h5" />
                      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                      <path d="M16 16h5v5" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5 bg-white/50 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-900">
              <div className="space-y-0.5">
                <span className="text-[8px] font-mono text-slate-400 dark:text-slate-500 uppercase block font-bold">Steps Sync</span>
                <span className="text-sm font-mono font-black text-slate-700 dark:text-slate-200">
                  {syncedSteps?.toLocaleString() || 0} <span className="text-[9px] font-mono font-normal text-slate-400 dark:text-slate-500">steps</span>
                </span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[8px] font-mono text-slate-400 dark:text-slate-500 uppercase block font-bold">Burned Active</span>
                <span className="text-sm font-mono font-black text-slate-700 dark:text-slate-200">
                  {syncedCalories || 0} <span className="text-[9px] font-mono font-normal text-slate-400 dark:text-slate-500">kcal</span>
                </span>
              </div>
            </div>
            
            <div className="text-[9px] text-slate-450 dark:text-slate-500 font-sans leading-relaxed text-center italic border-t border-slate-100 dark:border-slate-800/50 pt-1.5">
              Live wearable activity stream is operational-ready.
            </div>
          </div>
        )}

        {/* ACTIVE WORKOUT CHRONOMETER WIDGET */}
        <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-4 border border-slate-200/50 dark:border-slate-800 mt-3 relative overflow-hidden">
          {/* subtle decorative pulse if timer running */}
          {timerRunning && (
            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
          )}
          <span className="text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">
            Active Tracker
          </span>
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span id="timer-display" className="text-2xl font-mono font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                {formatTimerValue()}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                {timerSeconds > 0 ? `${Math.ceil(timerSeconds / 60)}m workout active` : 'No workout running'}
              </span>
            </div>

            <div className="flex gap-2">
              <button
                id="timer-start-pause"
                type="button"
                onClick={handleStartPause}
                className={`p-2 rounded-full transition-colors flex items-center justify-center ${
                  timerRunning
                    ? 'bg-amber-100 text-amber-600 hover:bg-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:hover:bg-amber-900/60'
                    : 'bg-teal-100 text-teal-600 hover:bg-teal-200 dark:bg-teal-950/40 dark:text-teal-400 dark:hover:bg-teal-900/60'
                }`}
                title={timerRunning ? 'Pause timer' : 'Start workout timer'}
              >
                {timerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>

              {timerSeconds > 0 && (
                <>
                  <button
                    id="timer-reset"
                    type="button"
                    onClick={handleReset}
                    className="p-2 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors flex items-center justify-center"
                    title="Reset workout timer"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <button
                    id="timer-commit"
                    type="button"
                    onClick={handleCommitTimer}
                    className="px-2.5 py-1 text-[10px] font-semibold tracking-tight uppercase bg-teal-500 hover:bg-teal-600 text-white rounded-lg flex items-center gap-1 transition"
                    title="Commit to today's log"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Save
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </MetricCard>
  );
}
