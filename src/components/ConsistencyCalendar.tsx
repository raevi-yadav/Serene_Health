import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Activity, Flame, Droplet, Info, X } from 'lucide-react';
import { DailyRecord, UserSettings } from '../types';
import { triggerHaptic } from '../utils/haptic';

interface ConsistencyCalendarProps {
  records: Record<string, DailyRecord>;
  activeDate: string; // This remains the global master date (e.g., Today)
  onSelectDate?: (dateStr: string) => void;
  isDarkMode?: boolean;
  settings: UserSettings;
}

export default function ConsistencyCalendar({
  records,
  activeDate,
  onSelectDate,
  isDarkMode = false,
  settings,
}: ConsistencyCalendarProps) {
  const initialDate = activeDate ? new Date(activeDate) : new Date();
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth());
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
  const [activeFilter, setActiveFilter] = useState<'exercise' | 'food' | 'water'>('exercise');
  const [showInfoModal, setShowInfoModal] = useState(false);
  
  // Localized preview state to allow non-destructive safe browsing
  const [previewDate, setPreviewDate] = useState<string>(activeDate);

  // Auto-sync the preview banner on month/date changes
  useEffect(() => {
    if (!activeDate) return;
    const masterDateObj = new Date(activeDate);
    if (isNaN(masterDateObj.getTime())) return;

    const masterYear = masterDateObj.getFullYear();
    const masterMonth = masterDateObj.getMonth();

    // PHASE 1: Handle External Global Shifts
    // If the master date picker changed to a completely different month page,
    // force-shift the calendar grid to that page and highlight that exact day.
    if (currentMonth !== masterMonth || currentYear !== masterYear) {
      setCurrentMonth(masterMonth);
      setCurrentYear(masterYear);
      setPreviewDate(activeDate);
      return; // Exit early to let the calendar page flip settle
    }

    // PHASE 2: Handle Local Page Browsing Shifts
    // If we are already displaying the master date's month, lock the ring onto it.
    if (currentYear === masterYear && currentMonth === masterMonth) {
      setPreviewDate(activeDate);
    } else {
      // If the user manually flips past pages away from the master date context:
      const today = new Date();
      // Default to 'Today' if they navigated back into the real-world current month
      if (currentYear === today.getFullYear() && currentMonth === today.getMonth()) {
        setPreviewDate(today.toISOString().split('T')[0]);
      } else {
        // Default to the 1st of the month for any older historical months
        const mm = String(currentMonth + 1).padStart(2, '0');
        setPreviewDate(`${currentYear}-${mm}-01`);
      }
    }
  }, [activeDate, currentMonth, currentYear]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const isNextMonthFuture = currentYear > today.getFullYear() || 
    (currentYear === today.getFullYear() && currentMonth >= today.getMonth());

  // --- STREAK CALCULATION ENGINE ---
  const getStartOfWeekStr = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    return d.toISOString().split('T')[0];
  };

  const getStreakDisplay = () => {
    if (activeFilter === 'water') {
      let streak = 0;
      let checkDate = new Date(todayStr);
      const target = settings.targetWaterMl || 2000;

      const todayWater = records[todayStr]?.water?.totalMl || 0;
      if (todayWater < target) {
        checkDate.setDate(checkDate.getDate() - 1);
      }

      while (true) {
        const dStr = checkDate.toISOString().split('T')[0];
        const loggedWater = records[dStr]?.water?.totalMl || 0;
        if (loggedWater >= target) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
      return `${streak} Day${streak === 1 ? '' : 's'}`;
    }

    if (activeFilter === 'food') {
      let streak = 0;
      let checkDate = new Date(todayStr);
      const targetCal = settings.targetCalories || 2200;
      const usedCheatWeeks: Record<string, boolean> = {};

      const todayCal = records[todayStr]?.diet?.calories || 0;
      if (todayCal === 0) {
        checkDate.setDate(checkDate.getDate() - 1);
      }

      for (let i = 0; i < 180; i++) {
        const dStr = checkDate.toISOString().split('T')[0];
        const weekKey = getStartOfWeekStr(dStr);
        const cal = records[dStr]?.diet?.calories || 0;
        const met = cal >= targetCal && cal <= targetCal * 1.2;

        if (met) {
          streak++;
        } else {
          if (!usedCheatWeeks[weekKey] && cal > 0) {
            usedCheatWeeks[weekKey] = true;
            streak++; 
          } else {
            break;
          }
        }
        checkDate.setDate(checkDate.getDate() - 1);
      }
      return `${streak} Day${streak === 1 ? '' : 's'}`;
    }

    if (activeFilter === 'exercise') {
      let weeklyStreak = 0;
      const targetDaysPerWeek = settings.targetExerciseDaysPerWeek || 4;
      const targetMin = settings.targetExerciseMinutes || 30;

      const currentWeekSunday = new Date(getStartOfWeekStr(todayStr));
      let walkWeekSunday = new Date(currentWeekSunday);

      const countDaysMetInWeek = (sundayDate: Date) => {
        let count = 0;
        let runDate = new Date(sundayDate);
        for (let d = 0; d < 7; d++) {
          const dStr = runDate.toISOString().split('T')[0];
          const mins = records[dStr]?.exercise?.durationMinutes || 0;
          if (mins >= targetMin) count++;
          runDate.setDate(runDate.getDate() + 1);
        }
        return count;
      };

      for (let w = 0; w < 52; w++) {
        const metCount = countDaysMetInWeek(walkWeekSunday);
        if (w === 0) {
          if (metCount >= targetDaysPerWeek) {
            weeklyStreak++;
          }
        } else {
          if (metCount >= targetDaysPerWeek) {
            weeklyStreak++;
          } else {
            break;
          }
        }
        walkWeekSunday.setDate(walkWeekSunday.getDate() - 7);
      }
      return `${weeklyStreak} Week${weeklyStreak === 1 ? '' : 's'}`;
    }

    return '0 Days';
  };

  // --- CALENDAR GRID GENERATION ---
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
    triggerHaptic(10);
  };

  const handleNextMonth = () => {
    if (isNextMonthFuture) return;
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
    triggerHaptic(10);
  };

  const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();

  const blanks = Array(firstDay).fill(null);
  const days = Array.from({ length: totalDays }, (_, i) => i + 1);
  const calendarGrid = [...blanks, ...days];

  const getDateString = (day: number) => {
    const mm = String(currentMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${currentYear}-${mm}-${dd}`;
  };

  const gridItemCellClass = "w-full aspect-square max-w-[34px] mx-auto flex items-center justify-center relative";

  return (
    <div
      id="consistency-calendar-card"
      className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-4 shadow-sm flex flex-col gap-4 relative"
    >
      {/* CARD TOP HEADER */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-sans font-bold text-slate-800 dark:text-slate-100">
          Consistency Map
        </h3>
        
        <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/40 px-2.5 py-1 rounded-xl">
          <span className="text-[10px] font-sans font-black text-amber-700 dark:text-amber-400 flex items-center gap-1">
            🔥 {getStreakDisplay()}
          </span>
          <button
            type="button"
            onClick={() => {
              setShowInfoModal(!showInfoModal);
              triggerHaptic(10);
            }}
            className="text-amber-600 dark:text-amber-500 hover:text-amber-800 dark:hover:text-amber-300 transition p-0.5 cursor-pointer"
          >
            <Info className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* DYNAMIC STREAK RULE EXPLANATION OVERLAY */}
      {showInfoModal && (
        <div className="absolute inset-x-4 top-14 bg-slate-900 text-white dark:bg-white dark:text-slate-900 p-3.5 rounded-2xl shadow-xl z-30 flex flex-col gap-1.5 border border-slate-800 dark:border-slate-200 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-slate-800/50 dark:border-slate-100/50 pb-1">
            <span className="text-[10px] font-sans font-black uppercase tracking-wider text-indigo-400 dark:text-indigo-600">
              Streak Target Matrix Rules
            </span>
            <button 
              type="button" 
              onClick={() => setShowInfoModal(false)}
              className="text-slate-400 hover:text-white dark:text-slate-500 dark:hover:text-slate-900 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] leading-relaxed font-sans text-slate-300 dark:text-slate-600">
            {activeFilter === 'exercise' && `Exercise streak is calculated weekly. Reach your routine target (${settings.targetExerciseDaysPerWeek || 4} days/week) to extend your streak chain.`}
            {activeFilter === 'food' && "Nutrition streak tracks consecutive days. You are allowed 1 cheat day buffer per calendar week without breaking your master daily streak chain."}
            {activeFilter === 'water' && `Hydration is a strict daily metric chain. Miss hitting your custom target limit (${settings.targetWaterMl || 2000}ml) on any single day, and the streak resets.`}
          </p>
        </div>
      )}

      {/* CATEGORY FILTER SELECTION TABS */}
      <div className="grid grid-cols-3 gap-1 bg-slate-50 dark:bg-slate-950 p-1 rounded-2xl border border-slate-100 dark:border-slate-850">
        {(['exercise', 'food', 'water'] as const).map((filter) => {
          const Icon = filter === 'exercise' ? Activity : filter === 'food' ? Flame : Droplet;
          const isActive = activeFilter === filter;
          return (
            <button
              key={filter}
              type="button"
              onClick={() => {
                setActiveFilter(filter);
                triggerHaptic(10);
              }}
              className={`flex items-center justify-center gap-1.5 py-2.5 text-[10px] uppercase font-bold tracking-wider rounded-xl transition cursor-pointer min-h-[38px] ${
                isActive
                  ? 'bg-indigo-500 text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{filter}</span>
            </button>
          );
        })}
      </div>

      {/* COMPACT CALENDAR CONTROLLER ROW */}
      <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/40 px-1 py-1 rounded-xl border border-slate-100 dark:border-slate-800/60">
        <button
          id="prev-month-btn"
          type="button"
          onClick={handlePrevMonth}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/60 transition cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-bold font-sans text-slate-700 dark:text-slate-200">
          {monthNames[currentMonth]} {currentYear}
        </span>
        <button
          id="next-month-btn"
          type="button"
          onClick={handleNextMonth}
          disabled={isNextMonthFuture}
          className={`w-9 h-9 flex items-center justify-center rounded-lg transition ${
            isNextMonthFuture 
              ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-40' 
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/60 cursor-pointer'
          }`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* MATRIX FRAMEWORK */}
      <div className="space-y-2.5 px-1">
        <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          {weekdays.map((wd, i) => (
            <div key={`${wd}-${i}`}>{wd}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-3 gap-x-2">
          {calendarGrid.map((dayNum, idx) => {
            if (dayNum === null) {
              return <div key={`empty-${idx}`} className={gridItemCellClass} />;
            }

            const dateStr = getDateString(dayNum);
            const isToday = dateStr === todayStr;
            const isFuture = dateStr > todayStr;
            const rec = records[dateStr];

            let bgClass = '';
            
            if (isFuture) {
              bgClass = 'bg-slate-50/40 dark:bg-slate-950/20 border border-dashed border-slate-200 dark:border-slate-850 opacity-20 cursor-not-allowed';
            } else {
              bgClass = 'bg-slate-100 dark:bg-slate-950 border border-slate-200/40 dark:border-slate-800/80';
              if (rec) {
                if (activeFilter === 'exercise') {
                  const duration = rec.exercise?.durationMinutes || 0;
                  if (duration > 0) {
                    bgClass = duration >= (settings.targetExerciseMinutes || 30) ? 'bg-emerald-500' : 'bg-rose-500';
                  }
                } else if (activeFilter === 'food') {
                  const calories = rec.diet?.calories || 0;
                  const target = settings.targetCalories || 2200;
                  if (calories > 0) {
                    if (calories >= target && calories <= target * 1.2) {
                      bgClass = 'bg-emerald-500';
                    } else if (calories > target * 1.2) {
                      bgClass = 'bg-amber-500 animate-pulse';
                    } else {
                      bgClass = 'bg-rose-500';
                    }
                  }
                } else if (activeFilter === 'water') {
                  const waterMl = rec.water?.totalMl || 0;
                  if (waterMl > 0) {
                    bgClass = waterMl >= (settings.targetWaterMl || 2000) ? 'bg-emerald-500' : 'bg-rose-500';
                  }
                }
              }
            }

            // The ring indicator now exclusively highlights what the user has actively tapped to look at (previewDate)
            const ringClass = dateStr === previewDate && !isFuture 
              ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 scale-110 z-10' 
              : '';

            // Optional structural marker: Adds a tiny core center dot to visually guide the user where "Today" actually is
            const todayIndicator = isToday && !isFuture ? (
              <span className="absolute w-1 h-1 bg-indigo-500 rounded-full bottom-0.5" />
            ) : null;

            return (
              <button
                id={`calendar-day-${dateStr}`}
                key={`day-${dayNum}`}
                type="button"
                disabled={isFuture}
                onClick={() => {
                  setPreviewDate(dateStr); // Updates only the local layout view frame block context safely
                  triggerHaptic(10);
                }}
                className={`${gridItemCellClass} rounded-full transition-all duration-150 ${bgClass} ${ringClass} ${!isFuture ? 'cursor-pointer' : ''}`}
              >
                {todayIndicator}
              </button>
            );
          })}
        </div>
      </div>

      {/* SELECTION READOUT CONTAINER (Driven by local previewDate) */}
      {(() => {
        const selectedRec = records[previewDate];
        const dateObj = new Date(previewDate);
        const formattedDate = !isNaN(dateObj.getTime())
          ? dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
          : previewDate;

        let statusText = 'No entries logged.';
        if (selectedRec && previewDate <= todayStr) {
          if (activeFilter === 'exercise' && (selectedRec.exercise?.durationMinutes || 0) > 0) {
            statusText = `Logged ${selectedRec.exercise?.durationMinutes}m of activity.`;
          } else if (activeFilter === 'food' && (selectedRec.diet?.calories || 0) > 0) {
            statusText = `Logged ${selectedRec.diet?.calories} kcal baseline intake.`;
          } else if (activeFilter === 'water' && (selectedRec.water?.totalMl || 0) > 0) {
            statusText = `Logged ${selectedRec.water?.totalMl}ml of total hydration.`;
          }
        } else if (previewDate > todayStr) {
          statusText = 'Future date locked.';
        }

        return (
          <div className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-950 px-3 py-2 rounded-xl border border-slate-100 dark:border-slate-850">
            <span className="font-sans font-black text-slate-800 dark:text-slate-200">{formattedDate}</span>
            <span className="font-medium text-slate-400 dark:text-slate-500 truncate max-w-[200px]">{statusText}</span>
          </div>
        );
      })()}

      {/* RESPONSIVE SYSTEM LEGENDS */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[10px] text-slate-400 dark:text-slate-500 font-mono pt-2 border-t border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-slate-100 dark:bg-slate-950 rounded-full border border-slate-200/60 dark:border-slate-800" />
          <span>Empty</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
          <span>Achieved</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-rose-500 rounded-full" />
          <span>Missed</span>
        </div>
        <div className={`flex items-center gap-1.5 ${activeFilter === 'food' ? 'flex' : 'hidden'}`}>
          <span className="w-2.5 h-2.5 bg-amber-500 rounded-full" />
          <span>Cheat / Excess</span>
        </div>
      </div>
    </div>
  );
}