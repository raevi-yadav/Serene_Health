import { Moon, Star } from 'lucide-react';
import { SleepRecord } from '../types';
import MetricCard from './MetricCard';
import { triggerHaptic } from '../utils/haptic';

interface SleepWidgetProps {
  record: SleepRecord;
  onChange: (updates: Partial<SleepRecord>) => void;
  targetHours: number;
}

export default function SleepWidget({ record, onChange, targetHours }: SleepWidgetProps) {
  const qualities = [
    { score: 1, label: 'Poor' },
    { score: 2, label: 'Restless' },
    { score: 3, label: 'Fair' },
    { score: 4, label: 'Good' },
    { score: 5, label: 'Excellent' },
  ];

  return (
    <MetricCard
      id="sleep-metric"
      title="Sleep Duration & Quality"
      icon={<Moon className="w-5 h-5" />}
      value={`${record.hours}h`}
      subtitle={`/ ${targetHours}h target`}
      accentColor="text-indigo-500"
    >
      <div className="space-y-5">
        {/* Number Input for Hours */}
        <div>
          <label className="text-xs font-sans text-slate-500 dark:text-slate-400 font-medium block mb-1.5">Hours Slept (hours)</label>
          <input
            id="sleep-hours-number"
            type="number"
            min="0"
            max="24"
            step="0.1"
            value={record.hours === 0 ? '' : record.hours}
            placeholder="e.g. 8.0"
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              onChange({ hours: isNaN(val) ? 0 : val });
            }}
            className="w-full px-3 py-2 text-sm font-mono border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100/50 focus:border-indigo-400 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800"
          />
        </div>

        {/* Quality Rating */}
        <div>
          <label className="text-xs font-sans text-slate-500 dark:text-slate-400 font-medium block mb-2">Sleep Quality</label>
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
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-850 text-indigo-600 dark:text-indigo-400 font-medium'
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

        {/* Sleep and Wake Times */}
        <div className="grid grid-cols-2 gap-4 pt-1 border-t border-slate-100 dark:border-slate-800">
          <div>
            <label className="text-xs font-sans text-slate-500 dark:text-slate-400 font-medium block mb-1">Sleep Time</label>
            <input
              id="sleep-time-input"
              type="time"
              value={record.sleepTime}
              onChange={(e) => onChange({ sleepTime: e.target.value })}
              className="w-full p-2 text-sm font-mono border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100/50 focus:border-indigo-400 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="text-xs font-sans text-slate-500 dark:text-slate-400 font-medium block mb-1">Wake Time</label>
            <input
              id="wake-time-input"
              type="time"
              value={record.wakeTime}
              onChange={(e) => onChange({ wakeTime: e.target.value })}
              className="w-full p-2 text-sm font-mono border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100/50 focus:border-indigo-400 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800"
            />
          </div>
        </div>
      </div>
    </MetricCard>
  );
}
