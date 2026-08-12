/**
 * Status Message Component
 * Displays success/error/warning messages with clean styling
 */

import { CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';

interface StatusMessageProps {
  type: 'success' | 'error' | 'warning';
  message: string;
}

export function StatusMessage({ type, message }: StatusMessageProps) {
  if (type === 'success') {
    return (
      <div className="flex items-start gap-3 rounded-lg p-3 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100">
        <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
        <p className="text-sm font-medium leading-relaxed flex-1">{message}</p>
      </div>
    );
  }

  if (type === 'warning') {
    return (
      <div className="flex items-start gap-3 rounded-lg p-3 bg-amber-50 text-amber-900 border border-amber-200 dark:bg-amber-950 dark:text-amber-100">
        <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5 text-amber-600" />
        <div className="flex-1">
          <p className="text-sm font-semibold mb-0.5">Perlu Konfirmasi</p>
          <p className="text-sm leading-relaxed">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-lg p-3 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100">
      <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
      <p className="text-sm font-medium leading-relaxed flex-1">{message}</p>
    </div>
  );
}
