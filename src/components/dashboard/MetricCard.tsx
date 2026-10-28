import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  badge?: string;
  badgeType?: 'default' | 'conflict' | 'resolved' | 'accent';
  icon?: React.ReactNode;
}

export function MetricCard({
  label,
  value,
  subtext,
  badge,
  badgeType = 'default',
  icon,
}: MetricCardProps) {
  const badgeClasses = {
    default: 'bg-surface-100 text-surface-700 border-surface-200',
    conflict: 'bg-conflict-50 text-conflict-700 border-conflict-200',
    resolved: 'bg-resolved-50 text-resolved-700 border-resolved-200',
    accent: 'bg-accent-50 text-accent-700 border-accent-200',
  };

  return (
    <div className="card p-4 flex flex-col justify-between">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xxs font-mono uppercase tracking-wider text-surface-500 font-medium">
          {label}
        </span>
        {icon && <div className="text-surface-400">{icon}</div>}
      </div>

      <div className="my-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold font-mono tracking-tight text-surface-900">
          {value}
        </span>
        {badge && (
          <span className={`text-xxs font-mono px-1.5 py-0.5 rounded border ${badgeClasses[badgeType]}`}>
            {badge}
          </span>
        )}
      </div>

      {subtext && (
        <p className="text-xs text-surface-500 font-sans mt-0.5">
          {subtext}
        </p>
      )}
    </div>
  );
}

