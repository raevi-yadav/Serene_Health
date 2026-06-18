import { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Activity } from 'lucide-react';
import { DailyRecord } from '../types';
import { formatDateLabel } from '../utils/date';

interface ConsistencyCalendarProps {
  records: Record<string, DailyRecord>;
  activeDate: string;
  onSelectDate?: (dateStr: string) => void;
  isDarkMode?: boolean;
}

export default function ConsistencyCalendar({
  records,
  activeDate,
  onSelectDate,
  isDarkMode = false,
}: ConsistencyCalendarProps) {
  // Use currently active date's month and year as initial view
  const initialDate = activeDate ? new Date(activeDate) : new Date();
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth());
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  // Get total days in month
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Get first day of month (0 = Sunday, 1 = Monday...)
  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const totalDays = getDaysInMonth(currentMonth, currentYear);
  const firstDay = getFirstDayOfMonth(currentMonth, currentYear);

  // Generate weekday headers
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Pad out empty spaces before the first day of the month
  const blanks = Array(firstDay).fill(null);
  
  // Array of day numbers
  const days = Array.from({ length: totalDays }, (_, i) => i + 1);

  // Combine empty spots and actual days
  const calendarGrid = [...blanks, ...days];

  // Map day number of current grid view to YYYY-MM-DD
  const getDateString = (day: number) => {
    const mm = String(currentMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${currentYear}-${mm}-${dd}`;
  };

  // Count consistency stats for the visible month
  const exerciseDays = days.filter((day) => {
    const dateStr = getDateString(day);
    const rec = records[dateStr];
    return rec && rec.exercise && rec.exercise.durationMinutes > 0;
  });

  const consistencyRate = days.length > 0
    ? Math.round((exerciseDays.length / days.length) * 100)
    : 0;

  return (
    <div
      id="consistency-calendar-card"
      className="bg-white/75 dark:bg-slate-905/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-5 shadow-subtle dark:shadow-none flex flex-col gap-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 text-emerald-500 rounded-xl">
            <Activity className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-sans font-bold text-slate-800 dark:text-slate-100">
              Consistency Streak Map
            </h3>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono block uppercase">
              Exercises done marked in green
            </span>
          </div>
        </div>

        {/* Consistency metrics Badge */}
        <div className="text-right">
          <span className="text-xs font-mono font-bold bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100/50 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-xl">
            {consistencyRate}% Active
          </span>
        </div>
      </div>

      {/* Month selectors */}
      <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-850/65 py-1 px-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60">
        <button
          id="prev-month-btn"
          type="button"
          onClick={handlePrevMonth}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
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
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div>
        <div className="grid grid-cols-7 gap-1 text-center mb-1">
          {weekdays.map((wd) => (
            <span
              key={wd}
              className="text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase"
            >
              {wd}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {calendarGrid.map((dayNum, idx) => {
            if (dayNum === null) {
              return <div key={`empty-${idx}`} className="aspect-square" />;
            }

            const dateStr = getDateString(dayNum);
            const isToday = dateStr === activeDate;
            const rec = records[dateStr];
            const hasExercise = rec && rec.exercise && rec.exercise.durationMinutes > 0;
            const exerciseType = hasExercise ? rec.exercise.type : '';
            const exerciseDuration = hasExercise ? rec.exercise.durationMinutes : 0;

            // Compute background color
            let bgClass = 'bg-slate-50/70 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300';
            let borderClass = 'border border-transparent';

            if (hasExercise) {
              // Workout completed! Vibrantly green
              bgClass = 'bg-emerald-500 hover:bg-emerald-600 font-bold text-white';
            }

            if (isToday) {
              borderClass = 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900';
            }

            return (
              <div
                id={`calendar-day-${dateStr}`}
                key={`day-${dayNum}`}
                title={
                  hasExercise
                    ? `${dayNum} ${monthNames[currentMonth]}: ${exerciseDuration}m ${exerciseType}`
                    : `${dayNum} ${monthNames[currentMonth]}: No exercise logged`
                }
                className={`aspect-square flex flex-col items-center justify-center rounded-xl text-xs transition relative cursor-default ${bgClass} ${borderClass}`}
              >
                <span>{dayNum}</span>
                {hasExercise && (
                  <span className="text-[7px] font-bold opacity-90 absolute bottom-1 block scale-90 font-mono">
                    {exerciseDuration}m
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend details */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-1 pt-2 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 bg-emerald-500 rounded-sm" />
          <span>Exercise done</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 bg-slate-150 dark:bg-slate-850 rounded-sm border border-slate-350 dark:border-slate-800" />
          <span>Active check-in</span>
        </div>
      </div>
    </div>
  );
}
