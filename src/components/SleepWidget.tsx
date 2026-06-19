import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Moon, Star } from 'lucide-react';
import { SleepRecord } from '../types';
import MetricCard from './MetricCard';
import { triggerHaptic } from '../utils/haptic';

interface SleepWidgetProps {
  record: SleepRecord;
  onChange: (updates: Partial<SleepRecord>) => void;
  targetHours: number;
}

// Helper to parse "HH:MM" 24h format into 12-hour parts
function parseTo12hParts(time24: string) {
  const [h24Str, mStr] = (time24 || '23:00').split(':');
  const h24 = parseInt(h24Str, 10) || 0;
  const minute = parseInt(mStr, 10) || 0;
  const isPm = h24 >= 12;
  let hour12 = h24 % 12;
  if (hour12 === 0) hour12 = 12;
  return { hour12, minute, isPm };
}

// Helper to format 12h parts back into "HH:MM" 24h string
function formatTo24h(hour12: number, minute: number, isPm: boolean): string {
  let h = hour12;
  if (isPm) {
    if (h < 12) h += 12;
  } else {
    if (h === 12) h = 0;
  }
  return `${h.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

// Helper for presentation display (e.g. "10:30 PM")
function formatTo12hForDisplay(time24: string): string {
  const { hour12, minute, isPm } = parseTo12hParts(time24);
  const mStr = minute.toString().padStart(2, '0');
  const amPm = isPm ? 'PM' : 'AM';
  return `${hour12}:${mStr} ${amPm}`;
}

// Calculate sleep duration hours slept (handles sleeping overnight across 00:00)
function calculateHours(sleep: string, wake: string): number {
  if (!sleep || !wake) return 0;
  const [sH, sM] = sleep.split(':').map(Number);
  const [wH, wM] = wake.split(':').map(Number);
  if (isNaN(sH) || isNaN(sM) || isNaN(wH) || isNaN(wM)) return 0;

  let diffMin = (wH * 60 + wM) - (sH * 60 + sM);
  if (diffMin < 0) {
    diffMin += 24 * 60; // Slept overnight / wake is next day
  }
  return Math.round((diffMin / 60) * 10) / 10;
}

export default function SleepWidget({ record, onChange, targetHours }: SleepWidgetProps) {
  const qualities = [
    { score: 1, label: 'Poor' },
    { score: 2, label: 'Restless' },
    { score: 3, label: 'Fair' },
    { score: 4, label: 'Good' },
    { score: 5, label: 'Excellent' },
  ];

  // Overlay Picker States
  const [showPicker, setShowPicker] = useState(false);
  const [tempSleepTime, setTempSleepTime] = useState(record.sleepTime || '23:00');
  const [tempWakeTime, setTempWakeTime] = useState(record.wakeTime || '06:00');
  const [activeMode, setActiveMode] = useState<'sleep' | 'wake'>('sleep');
  const [pickerSubmode, setPickerSubmode] = useState<'hour' | 'minute'>('hour');

  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  useEffect(() => {
    // Locate the portal root element in the DOM
    setPortalNode(document.getElementById('modal-portal-root'));
  }, []);

  const openPicker = () => {
    setTempSleepTime(record.sleepTime || '23:00');
    setTempWakeTime(record.wakeTime || '06:00');
    setActiveMode('sleep');
    setPickerSubmode('hour');
    setShowPicker(true);
  };

  // AM/PM Setter trigger
  const toggleAmPm = (isPm: boolean) => {
    const currentVal = activeMode === 'sleep' ? tempSleepTime : tempWakeTime;
    const parts = parseTo12hParts(currentVal);
    if (parts.isPm === isPm) return;
    const updatedStr = formatTo24h(parts.hour12, parts.minute, isPm);
    if (activeMode === 'sleep') {
      setTempSleepTime(updatedStr);
    } else {
      setTempWakeTime(updatedStr);
    }
  };

  // Clock label select triggers
  const selectClockHour = (num: number) => {
    const currentVal = activeMode === 'sleep' ? tempSleepTime : tempWakeTime;
    const parts = parseTo12hParts(currentVal);
    const updatedStr = formatTo24h(num, parts.minute, parts.isPm);
    if (activeMode === 'sleep') {
      setTempSleepTime(updatedStr);
    } else {
      setTempWakeTime(updatedStr);
    }
    
    // Auto-advance to minute editing for smooth UX
    setTimeout(() => {
      setPickerSubmode('minute');
    }, 180);
  };

  const selectClockMinute = (num: number) => {
    const currentVal = activeMode === 'sleep' ? tempSleepTime : tempWakeTime;
    const parts = parseTo12hParts(currentVal);
    const updatedStr = formatTo24h(parts.hour12, num, parts.isPm);
    if (activeMode === 'sleep') {
      setTempSleepTime(updatedStr);
    } else {
      setTempWakeTime(updatedStr);
    }
  };

  // Precise manual adjustments buttons
  const adjustMins = (deltaMins: number) => {
    const currentVal = activeMode === 'sleep' ? tempSleepTime : tempWakeTime;
    const { hour12, minute, isPm } = parseTo12hParts(currentVal);
    
    let totalMins = (hour12 % 12) * 60 + minute + (isPm ? 12 * 60 : 0);
    totalMins = (totalMins + deltaMins + 24 * 60) % (24 * 60);
    
    const finalHour24 = Math.floor(totalMins / 60);
    const finalMinute = totalMins % 60;
    
    let finalHour12 = finalHour24 % 12;
    if (finalHour12 === 0) finalHour12 = 12;
    const finalIsPm = finalHour24 >= 12;
    
    const updatedStr = formatTo24h(finalHour12, finalMinute, finalIsPm);
    if (activeMode === 'sleep') {
      setTempSleepTime(updatedStr);
    } else {
      setTempWakeTime(updatedStr);
    }
  };

  // Math for clock needle line vector target coordinates
  const activeVal = activeMode === 'sleep' ? tempSleepTime : tempWakeTime;
  const { hour12, minute, isPm: activeIsPm } = parseTo12hParts(activeVal);

  let angleDeg = 0;
  if (pickerSubmode === 'hour') {
    angleDeg = (hour12 * 30) - 90;
  } else {
    angleDeg = (minute * 6) - 90;
  }

  const angleRad = (angleDeg * Math.PI) / 180;
  const handLength = 65; // Matches radius of layout coordinates comfortably
  const tx = 112 + handLength * Math.cos(angleRad);
  const ty = 112 + handLength * Math.sin(angleRad);

  const numbers = pickerSubmode === 'hour' 
    ? [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
    : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  return (
    <MetricCard
      id="sleep-metric"
      title="Sleep Duration"
      icon={<Moon className="w-5 h-5 flex-shrink-0" />}
      value={`${record.hours}h`}
      subtitle={`/ ${targetHours}h target`}
      accentColor="text-indigo-500"
    >
      <div className="space-y-5">
        {/* Clickable Hours slept mock input trigger */}
        <div className="relative group">
          <label className="text-xs font-sans text-slate-500 dark:text-slate-400 font-medium block mb-1.5 font-bold">
            Hours Slept
          </label>
          <div className="relative cursor-pointer" onClick={openPicker}>
            <input
              id="sleep-hours-number"
              type="text"
              readOnly
              value={record.hours === 0 ? '0 hrs' : `${record.hours} hrs`}
              placeholder="Click to set sleep/wake times"
              className="w-full pl-3 pr-10 py-2.5 text-sm font-mono border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-300 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 cursor-pointer"
            />
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-indigo-500 group-hover:text-indigo-600 transition">
              <Moon className="w-4 h-4" />
            </div>
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-sans block mt-1.5">
            * Click hours above to set Sleep & Wake times
          </span>
        </div>

        {/* Quality Rating */}
        <div>
          <label className="text-xs font-sans text-slate-500 dark:text-slate-400 font-medium block mb-2 font-bold">Sleep Quality</label>
          <div className="grid grid-cols-5 gap-1.5">
            {qualities.map((item) => {
              const active = record.quality === item.score;
              return (
                <button
                  id={`sleep-quality-${item.score}`}
                  key={item.score}
                  type="button"
                  onClick={() => {
                    triggerHaptic(10);
                    onChange({ quality: item.score });
                  }}
                  className={`py-2 px-1 rounded-xl text-center border transition-all flex flex-col items-center gap-1.5 ${
                    active
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-850 text-indigo-600 dark:text-indigo-400 font-medium font-bold'
                      : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <Star
                    id={`sleep-star-${item.score}`}
                    className={`w-3.5 h-3.5 ${
                      active ? 'fill-indigo-500 dark:fill-indigo-400 text-indigo-500 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-600'
                    }`}
                  />
                  <span className="text-[10px] font-sans scale-90">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Read-Only Sleep and Wake Times displays */}
        <div className="grid grid-cols-2 gap-4 pt-1 border-t border-slate-100 dark:border-slate-800">
          <div>
            <label className="text-xs font-sans text-slate-400 dark:text-slate-500 font-medium block mb-1">
              Sleep Time
            </label>
            <input
              id="sleep-time-input"
              type="text"
              value={formatTo12hForDisplay(record.sleepTime)}
              readOnly
              className="w-full p-2.5 text-sm font-mono border border-slate-100 dark:border-slate-800 rounded-xl text-slate-500 dark:text-slate-405 bg-slate-50/[0.4] dark:bg-slate-800/[0.2] cursor-not-allowed"
            />
          </div>
          <div>
            <label className="text-xs font-sans text-slate-400 dark:text-slate-500 font-medium block mb-1">
              Wake Time
            </label>
            <input
              id="wake-time-input"
              type="text"
              value={formatTo12hForDisplay(record.wakeTime)}
              readOnly
              className="w-full p-2.5 text-sm font-mono border border-slate-100 dark:border-slate-800 rounded-xl text-slate-500 dark:text-slate-405 bg-slate-50/[0.4] dark:bg-slate-800/[0.2] cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* CLOCK MODE POPUP WIDGET OVERLAY */}
      {showPicker && portalNode && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/95 dark:bg-slate-950/98 backdrop-blur-xl animate-in fade-in duration-200">
          <div 
            id="clock-mode-timepicker" 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-2xl max-w-sm w-full space-y-4 relative select-none"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-1.5">
                <div className="p-1 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-lg">
                  <Moon className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-sans font-black text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                  Sleep Clock Time Picker
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPicker(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xl font-sans hover:scale-110 transition p-1"
              >
                ×
              </button>
            </div>

            {/* Calculated summary bar */}
            <div className="bg-indigo-50/40 dark:bg-indigo-950/20 px-3 py-2.5 rounded-2xl border border-indigo-100/30 dark:border-indigo-900/30 flex items-center justify-between">
              <div>
                <span className="text-[9px] font-mono uppercase text-indigo-500 dark:text-indigo-400 tracking-wider font-extrabold block">
                  Sleep Target Alignment
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-sans tracking-tight block mt-0.5">
                  {formatTo12hForDisplay(tempSleepTime)} → {formatTo12hForDisplay(tempWakeTime)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xl font-mono font-black text-indigo-600 dark:text-indigo-400 block leading-none">
                  {calculateHours(tempSleepTime, tempWakeTime)} hrs
                </span>
                <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest mt-0.5 block">
                  Duration
                </span>
              </div>
            </div>

            {/* Selection modes - Sleep Time vs Wake Time Selector */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(10);
                  setActiveMode('sleep');
                  setPickerSubmode('hour');
                }}
                className={`p-2.5 rounded-2xl border text-left transition-all ${
                  activeMode === 'sleep'
                    ? 'bg-indigo-50/50 dark:bg-indigo-950/25 border-indigo-500/80 dark:border-indigo-500 shadow-xs'
                    : 'border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/10 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <span className="text-[9px] font-mono uppercase text-slate-400 dark:text-slate-500 block font-bold leading-none mb-1">
                  Sleep Time
                </span>
                <span className="text-sm font-sans font-black text-slate-700 dark:text-slate-100">
                  {formatTo12hForDisplay(tempSleepTime)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic(10);
                  setActiveMode('wake');
                  setPickerSubmode('hour');
                }}
                className={`p-2.5 rounded-2xl border text-left transition-all ${
                  activeMode === 'wake'
                    ? 'bg-teal-50/50 dark:bg-teal-950/25 border-teal-500/80 dark:border-teal-500 shadow-xs'
                    : 'border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/10 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <span className="text-[9px] font-mono uppercase text-slate-400 dark:text-slate-500 block font-bold leading-none mb-1">
                  Wake Time
                </span>
                <span className="text-sm font-sans font-black text-slate-700 dark:text-slate-100">
                  {formatTo12hForDisplay(tempWakeTime)}
                </span>
              </button>
            </div>

            {/* Time units sub-selectors (Hours vs Minutes) & AM/PM selectors */}
            <div className="flex items-center justify-between gap-4 py-1.5 px-3 bg-slate-50 dark:bg-slate-950/30 rounded-2xl border border-slate-100 dark:border-slate-800/50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPickerSubmode('hour')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                    pickerSubmode === 'hour'
                      ? 'bg-indigo-600 text-white shadow-sm font-bold'
                      : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'
                  }`}
                >
                  Hour
                </button>
                <button
                  type="button"
                  onClick={() => setPickerSubmode('minute')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                    pickerSubmode === 'minute'
                      ? 'bg-indigo-600 text-white shadow-sm font-bold'
                      : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'
                  }`}
                >
                  Minute
                </button>
              </div>

              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(5);
                    toggleAmPm(false);
                  }}
                  className={`px-2 py-0.5 rounded-md text-xs font-bold font-mono transition-all ${
                    !activeIsPm
                      ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'
                  }`}
                >
                  AM
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(5);
                    toggleAmPm(true);
                  }}
                  className={`px-2 py-0.5 rounded-md text-xs font-bold font-mono transition-all ${
                    activeIsPm
                      ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'
                  }`}
                >
                  PM
                </button>
              </div>
            </div>

            {/* VISUAL ANALOG CLOCK FACE DIAL */}
            <div className="relative w-56 h-56 mx-auto bg-slate-50 dark:bg-slate-950/40 rounded-full border border-slate-200/60 dark:border-slate-800/80 flex items-center justify-center p-2">
              
              {/* SVG overlay containing Clock Arm needle line vector */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none select-none z-10">
                <line
                  x1={112}
                  y1={112}
                  x2={tx}
                  y2={ty}
                  className="stroke-indigo-600 dark:stroke-indigo-500 stroke-2"
                />
                <circle cx={112} cy={112} r={4.5} className="fill-indigo-600 dark:fill-indigo-400" />
                <circle
                  cx={tx}
                  cy={ty}
                  r={14}
                  className="fill-indigo-600/10 dark:fill-indigo-500/10 stroke-indigo-600 dark:stroke-indigo-500 stroke-1"
                />
              </svg>

              {/* Absolutely positioned clickable clock numbers with high precision spacing targets */}
              {numbers.map((num, i) => {
                const angle = ((i * 30 - 90) * Math.PI) / 180;
                const left = 50 + 38 * Math.cos(angle);
                const top = 50 + 38 * Math.sin(angle);
                
                let selected = false;
                if (pickerSubmode === 'hour') {
                  selected = num === hour12;
                } else {
                  selected = num === Math.round(minute / 5) * 5 % 60;
                }

                return (
                  <button
                    key={`${pickerSubmode}-${num}`}
                    type="button"
                    onClick={() => {
                      triggerHaptic(10);
                      if (pickerSubmode === 'hour') {
                        selectClockHour(num);
                      } else {
                        selectClockMinute(num);
                      }
                    }}
                    style={{
                      left: `${left}%`,
                      top: `${top}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    className={`absolute w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold font-mono transition-all z-20 cursor-pointer ${
                      selected
                        ? 'bg-indigo-600 text-white shadow-sm dark:bg-indigo-500 scale-110'
                        : 'hover:bg-slate-200/50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {pickerSubmode === 'hour' ? num : num.toString().padStart(2, '0')}
                  </button>
                );
              })}
            </div>

            {/* Modal footer action controls */}
            <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowPicker(false)}
                className="py-2 border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl text-xs font-semibold text-center transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const finalHours = calculateHours(tempSleepTime, tempWakeTime);
                  onChange({
                    hours: finalHours,
                    sleepTime: tempSleepTime,
                    wakeTime: tempWakeTime,
                  });
                  setShowPicker(false);
                }}
                className="py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold text-center shadow-xs transition shadow-sm font-bold"
              >
                Save
              </button>
            </div>
          </div>
        </div>,
        portalNode
      )}
    </MetricCard>
  );
}
