import { ReactNode } from 'react';

interface MetricCardProps {
  id?: string;
  title: string;
  icon: ReactNode;
  value?: string | number;
  subtitle?: string;
  children: ReactNode;
  accentColor?: string; // Tailwind class for text/border highlight (e.g., 'accent-teal-600')
}

export default function MetricCard({
  id,
  title,
  icon,
  value,
  subtitle,
  children,
  accentColor = 'text-slate-600 dark:text-slate-400',
}: MetricCardProps) {
  return (
    <div
      id={id}
      className="bg-white/75 dark:bg-slate-900/85 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 transition-all duration-300 hover:shadow-subtle hover:border-slate-300 dark:hover:border-slate-700"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {title}
          </span>
          {value !== undefined && (
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl font-sans font-semibold tracking-tight text-slate-800 dark:text-slate-100">
                {value}
              </span>
              {subtitle && (
                <span className="text-xs font-mono text-slate-400 dark:text-slate-500">{subtitle}</span>
              )}
            </div>
          )}
        </div>
        <div className={`p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 ${accentColor}`}>
          {icon}
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}
