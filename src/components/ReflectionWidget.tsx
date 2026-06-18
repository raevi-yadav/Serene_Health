import { useState, useEffect, useRef } from 'react';
import { Sparkles, CheckCircle2 } from 'lucide-react';

interface ReflectionWidgetProps {
  reflection: string;
  onSave: (val: string) => void;
}

export default function ReflectionWidget({ reflection, onSave }: ReflectionWidgetProps) {
  const [localVal, setLocalVal] = useState(reflection);
  const [isSaved, setIsSaved] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync with prop when date changes
  useEffect(() => {
    setLocalVal(reflection);
    setIsSaved(false);
  }, [reflection]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleChange = (val: string) => {
    setLocalVal(val);
    onSave(val);
    
    setIsSaved(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setIsSaved(false);
    }, 1500);
  };

  return (
    <div id="reflection-card-container" className="space-y-2 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase font-mono tracking-widest text-slate-450 dark:text-slate-500 font-extrabold flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-550 dark:text-indigo-400" />
          Daily Reflection
        </span>
        {isSaved && (
          <span className="text-[9px] font-mono text-emerald-500 flex items-center gap-1 animate-pulse">
            <CheckCircle2 className="w-3 h-3" />
            saved
          </span>
        )}
      </div>
      
      <div className="p-4 bg-white dark:bg-slate-905 border border-slate-205 dark:border-slate-800/80 rounded-2xl space-y-3 shadow-sm">
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          Jot down a quick thought about your mood, energy levels, or focus today:
        </p>
        <div className="relative flex items-center">
          <input
            id="daily-reflection-input"
            type="text"
            maxLength={120}
            placeholder="e.g., Felt super energetic after my workout! 🌱"
            value={localVal}
            onChange={(e) => handleChange(e.target.value)}
            className="w-full pl-3.5 pr-16 py-2.5 text-xs bg-slate-50/60 dark:bg-slate-850/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-300 focus:border-indigo-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 transition"
          />
          <div className="absolute right-3.5 text-[9px] font-mono text-slate-450 dark:text-slate-500 pointer-events-none select-none">
            {localVal.length}/120
          </div>
        </div>
      </div>
    </div>
  );
}
