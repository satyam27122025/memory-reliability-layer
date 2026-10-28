import type { FactStatus } from '../../types/facts';
import { AlertTriangle, CheckCircle, Shield } from 'lucide-react';

interface FactStatusBadgeProps {
  status: FactStatus;
  size?: 'sm' | 'md';
}

export function FactStatusBadge({ status, size = 'sm' }: FactStatusBadgeProps) {
  const isSm = size === 'sm';
  const sizeClasses = isSm ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';
  const iconSize = isSm ? 12 : 14;

  if (status === 'conflict') {
    return (
      <span className={`inline-flex items-center gap-1.5 font-medium rounded-md bg-conflict-50 text-conflict-700 border border-conflict-200 ${sizeClasses}`}>
        <AlertTriangle size={iconSize} className="text-conflict-600" />
        <span>Conflict</span>
      </span>
    );
  }

  if (status === 'resolved') {
    return (
      <span className={`inline-flex items-center gap-1.5 font-medium rounded-md bg-resolved-50 text-resolved-700 border border-resolved-200 ${sizeClasses}`}>
        <CheckCircle size={iconSize} className="text-resolved-600" />
        <span>Resolved</span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-md bg-accent-50 text-accent-700 border border-accent-200 ${sizeClasses}`}>
      <Shield size={iconSize} className="text-accent-600" />
      <span>Supported</span>
    </span>
  );
}

