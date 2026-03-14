/**
 * Status Message Component
 * Displays success/error messages with clean styling
 */

import { CheckCircle2, AlertCircle } from 'lucide-react';

interface StatusMessageProps {
  type: 'success' | 'error';
  message: string;
}

export function StatusMessage({ type, message }: StatusMessageProps) {
  const isSuccess = type === 'success';

  return (
    <div
      className={`flex items-start gap-3 rounded-lg p-3 ${
        isSuccess
          ? 'bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100'
          : 'bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100'
      }`}
    >
      {isSuccess ? (
        <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
      ) : (
        <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
      )}
      <p className="text-sm font-medium leading-relaxed flex-1">{message}</p>
    </div>
  );
}
