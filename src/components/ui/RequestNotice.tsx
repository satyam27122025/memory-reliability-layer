import { AlertCircle, RefreshCw } from 'lucide-react';
import { ApiError } from '../../services/memoryApi';
import { Button } from './Button';

interface RequestNoticeProps {
  error: unknown;
  onRetry: () => void;
  title?: string;
}

export function getRequestErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const status = error.status === null ? '' : ` (HTTP ${error.status})`;
    return `${error.message}${status}`;
  }
  return error instanceof Error ? error.message : 'An unexpected request error occurred.';
}

export function RequestNotice({
  error,
  onRetry,
  title = 'Could not load backend data',
}: RequestNoticeProps) {
  return (
    <div role="alert" className="card p-6 border-error-200 bg-error-50/50">
      <div className="flex items-start gap-3">
        <AlertCircle size={18} className="text-error-600 mt-0.5 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-error-800">{title}</h2>
          <p className="text-xs text-error-700 mt-1 break-words">{getRequestErrorMessage(error)}</p>
          <Button variant="secondary" size="sm" onClick={onRetry} className="mt-4">
            <RefreshCw size={13} />
            Retry
          </Button>
        </div>
      </div>
    </div>
  );
}
