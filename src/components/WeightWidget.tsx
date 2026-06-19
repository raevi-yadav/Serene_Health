import { Scale, Plus, Minus } from 'lucide-react';
import { WeightRecord } from '../types';
import MetricCard from './MetricCard';
import { triggerHaptic } from '../utils/haptic';

interface WeightWidgetProps {
  record: WeightRecord;
  onChange: (updates: Partial<WeightRecord>) => void;
  assumedWeight?: number | null;
}

export default function WeightWidget({ record, onChange, assumedWeight }: WeightWidgetProps) {
  const currentWeight = record.kg ?? assumedWeight ?? 70.0;

  const handleWeightChange = (newVal: number) => {
    // Round to 1 decimal place
    const rounded = Math.round(newVal * 10) / 10;
    onChange({ kg: rounded > 0 ? rounded : null });
  };

  const incrementWeight = (amt: number) => {
    triggerHaptic(15);
    handleWeightChange(currentWeight + amt);
  };

  return (
    <MetricCard
      id="weight-metric"
      title="Body Weight"
      icon={<Scale className="w-5 h-5" />}
      value={record.kg !== null ? `${record.kg} kg` : (assumedWeight ? `${assumedWeight} kg` : '-- kg')}
      subtitle={record.kg === null ? (assumedWeight ? 'Last recorded' : 'Not logged today') : 'Logged today'}
      accentColor="text-emerald-500"
    >
      <div className="space-y-4">
        {/* Direct weight input */}
        <div>
          <label className="text-xs font-sans text-slate-500 dark:text-slate-400 font-medium block mb-1">
            Current weight (kg)
          </label>
          <div className="flex gap-2">
            <input
              id="weight-input"
              type="number"
              inputMode="decimal"
              step="0.1"
              min="20"
              max="300"
              placeholder={record.kg !== null ? `${record.kg} kg` : (assumedWeight ? `${assumedWeight} kg` : '-- kg')}
              value={record.kg ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  onChange({ kg: null });
                } else {
                  onChange({ kg: parseFloat(val) });
                }
              }}
              className="flex-1 px-3 py-2 text-sm border font-mono border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-100/50 focus:border-emerald-400 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800"
            />
            {record.kg !== null && (
              <button
                id="clear-weight"
                type="button"
                onClick={() => {
                  triggerHaptic([15, 15]);
                  onChange({ kg: null });
                }}
                className="px-2.5 text-xs text-rose-500 dark:text-rose-400 border border-rose-100 dark:border-rose-950 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900 rounded-xl transition font-medium"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Quick calibration buttons */}
        <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[10px] font-mono font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">
            Quick Adjust
          </span>
          <div className="grid grid-cols-4 gap-1.5">
            <button
              id="weight-minus-1"
              type="button"
              onClick={() => incrementWeight(-1.0)}
              className="py-1 px-1 text-xs border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350 rounded-lg font-mono transition flex items-center justify-center gap-0.5"
            >
              <Minus className="w-3 h-3" /> 1kg
            </button>
            <button
              id="weight-minus-point-1"
              type="button"
              onClick={() => incrementWeight(-0.1)}
              className="py-1 px-1 text-xs border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350 rounded-lg font-mono transition flex items-center justify-center gap-0.5"
            >
              <Minus className="w-3 h-3" /> 0.1
            </button>
            <button
              id="weight-plus-point-1"
              type="button"
              onClick={() => incrementWeight(0.1)}
              className="py-1 px-1 text-xs border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350 rounded-lg font-mono transition flex items-center justify-center gap-0.5"
            >
              <Plus className="w-3 h-3" /> 0.1
            </button>
            <button
              id="weight-plus-1"
              type="button"
              onClick={() => incrementWeight(1.0)}
              className="py-1 px-1 text-xs border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350 rounded-lg font-mono transition flex items-center justify-center gap-0.5"
            >
              <Plus className="w-3 h-3" /> 1kg
            </button>
          </div>
        </div>
      </div>
    </MetricCard>
  );
}
