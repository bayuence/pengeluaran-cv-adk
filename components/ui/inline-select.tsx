'use client';

import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InlineSelectOption {
  value: string;
  label: string;
}

interface InlineSelectProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: InlineSelectOption[];
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  loading?: boolean;
}

export function InlineSelect({
  id,
  label,
  value,
  onChange,
  options,
  placeholder = `Pilih ${label}`,
  error,
  disabled = false,
  loading = false,
}: InlineSelectProps) {
  const hasError = !!error;
  const isDisabled = disabled || loading;

  return (
    <div className="space-y-2">
      {loading ? (
        <div className="flex items-center justify-center py-4 text-muted-foreground text-sm">
          <span>Memuat data...</span>
        </div>
      ) : options.length === 0 ? (
        <div className="flex items-center justify-center py-4 text-muted-foreground text-sm">
          <span>Tidak ada opsi tersedia</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => !isDisabled && onChange(option.value as any)}
              disabled={isDisabled}
              className={cn(
                'flex items-center justify-center gap-2 px-3 py-3 text-sm rounded-lg transition-all duration-200 min-h-[56px]',
                option.value === value
                  ? 'bg-primary text-primary-foreground font-medium shadow-md ring-2 ring-primary ring-offset-1'
                  : 'bg-muted hover:bg-muted/80 border border-border text-foreground',
                isDisabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <span className="line-clamp-2">{option.label}</span>
              {option.value === value && (
                <Check className="h-4 w-4 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}

      {hasError && <p className="text-xs text-destructive font-medium">{error}</p>}
    </div>
  );
}
