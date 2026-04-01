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

  // Calculate grid configuration based on option count
  const optionCount = options.length;
  
  // Determine if we should use 2 columns (when count not divisible by 3)
  const useTwoColumns = optionCount % 3 !== 0;
  
  // For mobile: always use 2 columns
  // For desktop: use 3 columns only when divisible by 3, otherwise 2 columns
  const gridClass = useTwoColumns 
    ? "grid grid-cols-2 gap-2" 
    : "grid grid-cols-2 sm:grid-cols-3 gap-2";

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
        <div className={gridClass}>
          {options.map((option, index) => {
            // Check if this is the last item and there's a remainder of 1
            const isLastWithRemainderOne = 
              index === optionCount - 1 && 
              optionCount % 3 === 1 && 
              optionCount > 1;
            
            return (
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
                  isDisabled && 'opacity-50 cursor-not-allowed',
                  // When remainder is 1 and this is the last item, span 2 columns and center
                  isLastWithRemainderOne && 'col-span-2 max-w-[calc(50%-0.5rem)] mx-auto'
                )}
              >
                <span className="line-clamp-2">{option.label}</span>
                {option.value === value && (
                  <Check className="h-4 w-4 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {hasError && <p className="text-xs text-destructive font-medium">{error}</p>}
    </div>
  );
}
