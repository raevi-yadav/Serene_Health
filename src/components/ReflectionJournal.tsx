import { useState } from 'react';
import { BookOpen, Calendar, Quote, Search, Trash2 } from 'lucide-react';
import { DailyRecord } from '../types';
import { formatDateLabel } from '../utils/date';
import { triggerHaptic } from '../utils/haptic';

interface ReflectionJournalProps {
  records: Record<string, DailyRecord>;
  onClearReflection?: (date: string) => void;
}

export default function ReflectionJournal({ records, onClearReflection }: ReflectionJournalProps) {
  const [showJournal, setShowJournal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Extract non-empty daily reflections
  const entries = Object.entries(records)
    .filter(([_, record]) => record.reflection && record.reflection.trim() !== '')
    .map(([date, record]) => ({
      date,
      reflection: record.reflection || '',
    }))
    .sort((a, b) => b.date.localeCompare(a.date)); // Sort chronologically, descending

  // Filter entries based on search query
  const filteredEntries = entries.filter((entry) =>
    entry.reflection.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleJournalFormat = () => {
    triggerHaptic(15);
    setShowJournal(!showJournal);
  };

  return (
    <div id="reflection-journal-card" className="bg-white/75 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/85 p-5 rounded-3xl shadow-subtle dark:shadow-none space-y-4">
      {/* Card Header & Format Select Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <BookOpen className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-sans font-bold text-slate-800 dark:text-slate-100">
              Daily Reflections Journal
            </h3>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono block uppercase">
              Chronological log of your thoughts
            </span>
          </div>
        </div>

        {/* The option to show reflections in journal format */}
        <button
          id="toggle-journal-btn"
          type="button"
          onClick={toggleJournalFormat}
          className={`py-1.5 px-3 rounded-xl border text-[11px] font-semibold flex items-center gap-1.5 transition ${
            showJournal
              ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
              : 'bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          {showJournal ? 'Hide Journal' : 'Show Journal'}
        </button>
      </div>

      {showJournal && (
        <div id="reflection-journal-body" className="space-y-4 animate-in fade-in duration-300">
          {/* Subtle Search Bar to quickly traverse past insights */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-600" />
            <input
              id="journal-search-input"
              type="text"
              placeholder="Search thoughts & moods..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8.5 pr-3.5 py-1.5 text-xs bg-slate-50/60 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800/50 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-300 text-slate-800 dark:text-slate-100"
            />
          </div>

          {entries.length === 0 ? (
            <div className="text-center py-6 px-4 bg-slate-50/30 dark:bg-slate-800/10 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              <span className="text-slate-400 dark:text-slate-600 block text-xs">
                No reflections recorded yet.
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-1">
                Jot down your daily insights under the "Home" tab first!
              </span>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-6 px-4">
              <span className="text-slate-400 dark:text-slate-500 text-xs block">
                No reflections found matching "{searchQuery}"
              </span>
            </div>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {filteredEntries.map(({ date, reflection }) => (
                <div
                  id={`journal-row-${date}`}
                  key={date}
                  className="group relative p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/60 rounded-2xl transition hover:border-indigo-100/80 dark:hover:border-indigo-900/40 hover:shadow-subtle"
                >
                  {/* Top line with Date Label */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500 font-mono text-[9px] uppercase tracking-wider font-bold">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatDateLabel(date)}</span>
                    </div>
                    {onClearReflection && (
                      <button
                        id={`delete-reflection-${date}`}
                        type="button"
                        onClick={() => {
                          triggerHaptic([10, 10]);
                          onClearReflection(date);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-rose-450 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 p-1 rounded-lg transition-all"
                        title="Delete this reflection"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Reflection Text with Quotations Styling */}
                  <div className="flex gap-2 items-start">
                    <Quote className="w-4 h-4 text-indigo-300 dark:text-indigo-805/50 flex-shrink-0 rotate-180 mt-0.5" />
                    <p className="text-xs text-slate-600 dark:text-slate-200 leading-relaxed font-sans italic selection:bg-indigo-100 dark:selection:bg-indigo-950">
                      {reflection}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
