import { Droplet, Plus, Minus, Settings } from 'lucide-react';
import { WaterRecord } from '../types';
import MetricCard from './MetricCard';
import { triggerHaptic } from '../utils/haptic';

interface WaterWidgetProps {
  record: WaterRecord;
  onChange: (updates: Partial<WaterRecord>) => void;
  targetWaterMl: number;
}

export default function WaterWidget({ record, onChange, targetWaterMl }: WaterWidgetProps) {
  const incrementWater = (amount: number) => {
    triggerHaptic(15);
    onChange({ totalMl: Math.max(0, record.totalMl + amount) });
  };

  const handleGlassSizeChange = (size: number) => {
    triggerHaptic(10);
    onChange({ glassSizeMl: size });
  };

  const resetWater = () => {
    triggerHaptic([20, 30, 20]);
    onChange({ totalMl: 0 });
  };

  const percentage = Math.min(Math.round((record.totalMl / targetWaterMl) * 100), 100);

  return (
    <MetricCard
      id="water-metric"
      title="Daily Hydration"
      icon={<Droplet className="w-5 h-5" />}
      value={`${record.totalMl} ml`}
      subtitle={`/ ${targetWaterMl} ml goal`}
      accentColor="text-sky-500"
    >
      <div className="space-y-4">
        {/* Sleek circular progress container or custom indicator bar */}
        <div className="relative pt-1">
          <div className="flex justify-between items-center mb-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium font-sans">
            <span>Hydration level</span>
            <span className="font-mono text-sky-600 dark:text-sky-400 font-semibold">{percentage}%</span>
          </div>

          <div className="w-full bg-slate-100/80 dark:bg-slate-800/80 rounded-full h-3.5 relative overflow-hidden ring-1 ring-slate-100 dark:ring-slate-800">
            {/* Smooth water wave look */}
            <div
              id="water-progress"
              className="bg-gradient-to-r from-sky-400 to-sky-500 h-full rounded-full transition-all duration-700 relative"
              style={{ width: `${percentage}%` }}
            >
              <div className="absolute inset-0 bg-white/10 waves-shimmer pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Quick Add Widget */}
        <div className="flex gap-2">
          {/* Main quick add button */}
          <button
            id="quick-add-drink"
            type="button"
            onClick={() => incrementWater(record.glassSizeMl)}
            className="flex-[2] py-2.5 px-3 bg-sky-500 hover:bg-sky-600 active:scale-95 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all shadow-sky-100 dark:shadow-none"
          >
            <Plus className="w-4 h-4" />
            <span>+{record.glassSizeMl} ml Glass</span>
          </button>

          {/* Quick decrease */}
          <button
            id="decrease-water"
            type="button"
            onClick={() => incrementWater(-record.glassSizeMl)}
            className="p-2.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 text-slate-500 dark:text-slate-400 rounded-xl hover:text-slate-755 dark:hover:text-slate-200 transition"
            title="Subtract glass"
          >
            <Minus className="w-4 h-4" />
          </button>

          {/* Reset today */}
          <button
            id="reset-water"
            type="button"
            onClick={resetWater}
            className="py-2.5 px-2.5 text-[10px] font-mono text-slate-400 dark:text-slate-500 hover:text-slate-650 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl transition"
          >
            Reset
          </button>
        </div>

        {/* Custom increments & config */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[10px] font-mono font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Default Glass Size
            </span>
          </div>
          
          <div className="grid grid-cols-3 gap-1.5">
            {[250, 500, 750].map((size) => {
              const active = record.glassSizeMl === size;
              return (
                <button
                  id={`water-glass-size-${size}`}
                  key={size}
                  type="button"
                  onClick={() => handleGlassSizeChange(size)}
                  className={`py-1 px-2 text-xs rounded-lg text-center font-mono border transition-all ${
                    active
                      ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-850 text-sky-600 dark:text-sky-400 font-semibold'
                      : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {size} ml
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </MetricCard>
  );
}
