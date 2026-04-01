'use client';

import * as React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileSelectOption {
  value: string;
  label: string;
}

interface MobileSelectProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: MobileSelectOption[];
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  loading?: boolean;
}

export function MobileSelect({
  id,
  label,
  value,
  onChange,
  options,
  placeholder = `-- Pilih ${label} --`,
  error,
  disabled = false,
  loading = false,
}: MobileSelectProps) {
  const [open, setOpen] = React.useState(false);

  // Find selected option label
  const selectedOption = options.find((opt) => opt.value === value);
  const displayValue = selectedOption?.label || '';

  const handleSelect = (optionValue: string) => {
    onChange(optionValue as any);
    setOpen(false);
  };

  const hasError = !!error;
  const isDisabled = disabled || loading;

  return (
    <>
      {/* Trigger Button - displays like a select */}
      <button
        type="button"
        onClick={() => !isDisabled && setOpen(true)}
        disabled={isDisabled}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-lg border bg-input px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 appearance-none cursor-pointer text-left',
          hasError ? 'border-destructive focus-visible:ring-destructive' : 'border-input'
        )}
      >
        <span className={displayValue ? 'text-foreground' : 'text-muted-foreground'}>
          {displayValue || (loading ? 'Memuat dari spreadsheet...' : placeholder)}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </button>

      {/* Bottom Sheet for Mobile with Grid Options */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl">
          <SheetHeader className="px-1">
            <SheetTitle className="text-lg">{label}</SheetTitle>
            <SheetDescription>Pilih salah satu opsi di bawah</SheetDescription>
          </SheetHeader>

          {/* Options Grid - Scrollable */}
          <div className="flex-1 overflow-y-auto py-2 px-1">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <span>Memuat data...</span>
              </div>
            ) : options.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <span>Tidak ada opsi tersedia</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {options.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={cn(
                      'flex items-center justify-center px-3 py-3 text-sm rounded-lg transition-colors text-center min-h-[60px]',
                      option.value === value
                        ? 'bg-primary text-primary-foreground font-medium shadow-md'
                        : 'bg-muted hover:bg-muted/80 border border-border'
                    )}
                  >
                    <span className="line-clamp-2">{option.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <SheetFooter className="px-1">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="w-full"
            >
              Batal
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Error Message */}
      {hasError && <p className="text-xs text-destructive font-medium">{error}</p>}
    </>
  );
}
