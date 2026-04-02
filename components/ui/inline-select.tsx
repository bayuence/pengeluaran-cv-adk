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
  
  // Logic: 
  // - Even count → 2 columns (2+2+2...)
  // - Odd count → 3 columns (so last row has 2 or 3 items, not 1 alone)
  //   - 3 items → 3 in one row
  //   - 5 items → 3 + 2
  //   - 7 items → 3 + 3 + 1 (unavoidable)
  const useThreeColumns = optionCount % 2 === 1 && optionCount > 1;
  const gridClass = useThreeColumns 
    ? "grid grid-cols-3 gap-2" 
    : "grid grid-cols-2 gap-2";

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
          {options.map((option) => {
            // For 3-column grid: center the last item only when remainder is 1
            // For 2-column grid: no centering needed (always even)
            const isLastWithRemainderOne = 
              useThreeColumns &&
              option === options[optionCount - 1] && 
              optionCount % 3 === 1;
            
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
                  // When remainder is 1 and this is the last item in 3-col grid, center it
                  isLastWithRemainderOne && 'col-start-2'
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
