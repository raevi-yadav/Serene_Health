import { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Sparkles, Calendar, Moon, Droplet, Flame, Scale, Activity } from 'lucide-react';
import { DailyRecord } from '../types';
import { formatDateLabel, formatDayOfWeek } from '../utils/date';

interface WeeklyTrendsProps {
  pastWeekRecords: DailyRecord[];
  isDarkMode?: boolean;
  isMobileFrame?: boolean;
}

type ChartType = 'summary' | 'sleep-vs-weight' | 'exercise-vs-water' | 'calories';

export default function WeeklyTrends({
  pastWeekRecords,
  isDarkMode = false,
  isMobileFrame = false,
}: WeeklyTrendsProps) {
  const [activeTab, setActiveTab] = useState<ChartType>('summary');

  // Format data for Recharts
  const chartData = pastWeekRecords.map((record) => {
    return {
      date: record.date,
      dateLabel: formatDateLabel(record.date),
      sleepHours: record.sleep.hours,
      sleepQuality: record.sleep.quality,
      waterMl: record.water.totalMl,
      calories: record.diet.calories,
      weightKg: record.weight.kg ?? 70.0, // fallback if not logged for visualization
      weightLogged: record.weight.kg !== null,
      exerciseMinutes: record.exercise.durationMinutes,
    };
  });

  const getWeekSummaryStats = () => {
    let totalWater = 0;
    let totalExercise = 0;
    let totalCalories = 0;
    let totalSleep = 0;
    let loggedWeights: number[] = [];

    pastWeekRecords.forEach((r) => {
      totalWater += r.water.totalMl;
      totalExercise += r.exercise.durationMinutes;
      totalCalories += r.diet.calories;
      totalSleep += r.sleep.hours;
      if (r.weight.kg !== null) {
        loggedWeights.push(r.weight.kg);
      }
    });

    const daysCount = pastWeekRecords.length || 7;
    const avgSleep = Math.round((totalSleep / daysCount) * 10) / 10;
    const avgWater = Math.round(totalWater / daysCount);
    const avgExercise = Math.round(totalExercise / daysCount);
    const avgCalories = Math.round(totalCalories / daysCount);
    const avgWeight = loggedWeights.length
      ? Math.round((loggedWeights.reduce((a, b) => a + b, 0) / loggedWeights.length) * 10) / 10
      : null;

    return { avgSleep, avgWater, avgExercise, avgCalories, avgWeight };
  };

  const { avgSleep, avgWater, avgExercise, avgCalories, avgWeight } = getWeekSummaryStats();

  const gridLineColor = isDarkMode ? '#334155' : '#f1f5f9';
  const labelColor = isDarkMode ? '#94a3b8' : '#64748b';
  const strokeColor = isDarkMode ? '#475569' : '#cbd5e1';

  return (
    <div
      id="trends-container"
      className="bg-white/75 dark:bg-slate-900/85 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-subtle dark:shadow-none flex flex-col gap-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-sans tracking-tight text-emerald-400 font-bold dark:text-emerald-400 mt-1 flex items-center gap-2">
            Weekly Insights & Trends
          </h2>
        </div>

        {/* Tab selection */}
        <div className="flex flex-wrap gap-1 bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/40 dark:border-slate-700/30">
          <button
            id="tab-summary"
            type="button"
            onClick={() => setActiveTab('summary')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition ${
              activeTab === 'summary'
                ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Snapshot List
          </button>
          <button
            id="tab-sleep-vs-weight"
            type="button"
            onClick={() => setActiveTab('sleep-vs-weight')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition ${
              activeTab === 'sleep-vs-weight'
                ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Sleep vs Weight
          </button>
          <button
            id="tab-exercise-vs-water"
            type="button"
            onClick={() => setActiveTab('exercise-vs-water')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition ${
              activeTab === 'exercise-vs-water'
                ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Exercise vs Water
          </button>
          <button
            id="tab-calories"
            type="button"
            onClick={() => setActiveTab('calories')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition ${
              activeTab === 'calories'
                ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Calories
          </button>
        </div>
      </div>

      {/* Week Averages Quick Rail */}
      <div className={`grid gap-3 bg-slate-50/50 dark:bg-slate-800/20 p-4 border border-slate-100 dark:border-slate-800 rounded-2xl ${
        isMobileFrame 
          ? 'grid-cols-2' 
          : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5'
      }`}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 border border-indigo-100 dark:bg-indigo-950/40 dark:border-indigo-900/50 text-indigo-500 rounded-xl">
            <Moon className="w-4 h-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase truncate">Avg Sleep</span>
            <span className="text-sm font-sans font-semibold text-slate-700 dark:text-slate-200 truncate">{avgSleep} hrs</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 border border-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-900/50 text-emerald-500 rounded-xl">
            <Scale className="w-4 h-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase truncate">Avg Weight</span>
            <span className="text-sm font-sans font-semibold text-slate-700 dark:text-slate-200 truncate">
              {avgWeight ? `${avgWeight} kg` : '-- kg'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 bg-sky-50 border border-sky-100 dark:bg-sky-950/40 dark:border-sky-900/50 text-sky-500 rounded-xl">
            <Droplet className="w-4 h-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase truncate">Avg Water</span>
            <span className="text-sm font-sans font-semibold text-slate-700 dark:text-slate-200 truncate">{avgWater} ml</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-50 border border-teal-100 dark:bg-teal-950/40 dark:border-teal-900/50 text-teal-500 rounded-xl">
            <Activity className="w-4 h-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase truncate">Avg Exercise</span>
            <span className="text-sm font-sans font-semibold text-slate-700 dark:text-slate-200 truncate">{avgExercise} mins</span>
          </div>
        </div>

        <div className={`flex items-center gap-3 ${isMobileFrame ? 'col-span-2' : 'col-span-2 md:col-span-1'}`}>
          <div className="p-2 bg-rose-50 border border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/50 text-rose-500 rounded-xl">
            <Flame className="w-4 h-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase truncate">Avg Energy</span>
            <span className="text-sm font-sans font-semibold text-slate-700 dark:text-slate-200 truncate">{avgCalories} kcal</span>
          </div>
        </div>
      </div>

      {/* Main Tab Render Panel */}
      <div className="min-h-72 text-slate-700 dark:text-slate-300">
        {activeTab === 'summary' && (
          <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/40">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase font-mono tracking-wider font-semibold text-slate-400 dark:text-slate-500">
                  <th className="py-3 px-4">Day</th>
                  <th className="py-3 px-4">Sleep</th>
                  <th className="py-3 px-4">Diet</th>
                  <th className="py-3 px-4">Water</th>
                  <th className="py-3 px-4">Weight</th>
                  <th className="py-3 px-4">Exercise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
                {pastWeekRecords.map((r) => {
                  const label = formatDayOfWeek(r.date);
                  return (
                    <tr key={r.date} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition">
                      <td className="py-3.5 px-4 font-sans font-medium text-slate-700 dark:text-slate-200">{label}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{r.sleep.hours}h</span>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500">Time: {r.sleep.sleepTime}-{r.sleep.wakeTime}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-slate-600 dark:text-slate-300 font-mono">
                        {r.diet.calories} kcal
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-slate-600 dark:text-slate-300 font-mono">{r.water.totalMl} ml</td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-slate-600 dark:text-slate-300 font-mono">
                        {r.weight.kg !== null ? `${r.weight.kg} kg` : '--'}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{r.exercise.durationMinutes}m</span>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500">
                            {r.exercise.type} • {r.exercise.intensity}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'sleep-vs-weight' && (
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridLineColor} vertical={false} />
                <XAxis dataKey="dateLabel" tick={{ fontSize: 10, fill: labelColor }} stroke={strokeColor} tickLine={false} />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 10, fill: labelColor }}
                  stroke={strokeColor}
                  tickLine={false}
                  label={{ value: 'Sleep (hours)', angle: -90, position: 'insideLeft', style: { fontSize: '10px', fill: labelColor } }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 10, fill: labelColor }}
                  stroke={strokeColor}
                  tickLine={false}
                  label={{ value: 'Weight (kg)', angle: 90, position: 'insideRight', style: { fontSize: '10px', fill: labelColor } }}
                />
                <Tooltip
                  contentStyle={{
                    background: isDarkMode ? '#1e293b' : '#ffffff',
                    border: isDarkMode ? '1px solid #334155' : '1px solid #f1f5f9',
                    borderRadius: '16px',
                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.05)',
                  }}
                  labelStyle={{ fontWeight: 600, fontSize: '12px', color: isDarkMode ? '#f8fafc' : '#1e293b' }}
                  itemStyle={{ fontSize: '11px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar yAxisId="left" dataKey="sleepHours" name="Sleep Duration" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={24} />
                <Line yAxisId="right" type="monotone" dataKey="weightKg" name="Weight" stroke="#10b981" strokeWidth={2} activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeTab === 'exercise-vs-water' && (
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridLineColor} vertical={false} />
                <XAxis dataKey="dateLabel" tick={{ fontSize: 10, fill: labelColor }} stroke={strokeColor} tickLine={false} />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 10, fill: labelColor }}
                  stroke={strokeColor}
                  tickLine={false}
                  label={{ value: 'Exercise (mins)', angle: -90, position: 'insideLeft', style: { fontSize: '10px', fill: labelColor } }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 10, fill: labelColor }}
                  stroke={strokeColor}
                  tickLine={false}
                  label={{ value: 'Water (ml)', angle: 90, position: 'insideRight', style: { fontSize: '10px', fill: labelColor } }}
                />
                <Tooltip
                  contentStyle={{
                    background: isDarkMode ? '#1e293b' : '#ffffff',
                    border: isDarkMode ? '1px solid #334155' : '1px solid #f1f5f9',
                    borderRadius: '16px',
                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.05)',
                  }}
                  labelStyle={{ fontWeight: 600, fontSize: '12px', color: isDarkMode ? '#f8fafc' : '#1e293b' }}
                  itemStyle={{ fontSize: '11px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar yAxisId="left" dataKey="exerciseMinutes" name="Exercise duration" fill="#14b8a6" radius={[4, 4, 0, 0]} barSize={24} />
                <Line yAxisId="right" type="monotone" dataKey="waterMl" name="Water Intake" stroke="#0ea5e9" strokeWidth={2} activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeTab === 'calories' && (
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridLineColor} vertical={false} />
                <XAxis dataKey="dateLabel" tick={{ fontSize: 10, fill: labelColor }} stroke={strokeColor} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: labelColor }} stroke={strokeColor} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: isDarkMode ? '#1e293b' : '#ffffff',
                    border: isDarkMode ? '1px solid #334155' : '1px solid #f1f5f9',
                    borderRadius: '16px',
                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.05)',
                  }}
                  labelStyle={{ fontWeight: 600, fontSize: '12px', color: isDarkMode ? '#f8fafc' : '#1e293b' }}
                  itemStyle={{ fontSize: '11px' }}
                />
                <Bar dataKey="calories" name="Caloric Intake" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={32} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
