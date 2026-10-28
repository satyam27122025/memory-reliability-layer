import type { FactStatus } from '../../types/facts';

interface BadgeProps {
  status: FactStatus;
  label?: string;
  size?: 'sm' | 'md';
}

const statusConfig: Record<FactStatus, { className: string; defaultLabel: string }> = {
  conflict: {
    className: 'bg-conflict-50 text-conflict-700 border border-conflict-200',
    defaultLabel: 'Conflict',
  },
  resolved: {
    className: 'bg-resolved-50 text-resolved-700 border border-resolved-200',
    defaultLabel: 'Resolved',
  },
  supported: {
    className: 'bg-accent-50 text-accent-700 border border-accent-200',
    defaultLabel: 'Supported',
  },
};

export function Badge({ status, label, size = 'sm' }: BadgeProps) {
  const config = statusConfig[status];
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1 font-medium rounded-md ${config.className} ${sizeClass}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${
        status === 'conflict' ? 'bg-conflict-500' :
        status === 'resolved' ? 'bg-resolved-500' : 'bg-accent-500'
      }`} />
      {label || config.defaultLabel}
    </span>
  );
}
