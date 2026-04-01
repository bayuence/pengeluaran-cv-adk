/**
 * Reusable Form Field Component
 * Handles text, email, date, number, select, textarea, and file inputs with validation display
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ChevronDown } from 'lucide-react';
import { MobileSelect } from '@/components/ui/mobile-select';
import { InlineSelect } from '@/components/ui/inline-select';

interface FormFieldProps {
  id: string;
  label: string;
  name: string;
  type?: 'text' | 'email' | 'date' | 'number' | 'currency' | 'select' | 'mobile-select' | 'inline-select' | 'textarea' | 'file';
  placeholder?: string;
  value?: string;
  error?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onFileChange?: (file: File | null) => void;
  required?: boolean;
  disabled?: boolean;
  options?: { value: string; label: string }[];
  loading?: boolean;
  children?: React.ReactNode;
  accept?: string;
}

export function FormField({
  id,
  label,
  name,
  type = 'text',
  placeholder,
  value = '',
  error,
  onChange,
  onFileChange,
  required = false,
  disabled = false,
  options = [],
  loading = false,
  children,
  accept,
}: FormFieldProps) {
  const hasError = !!error;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    onFileChange?.(file);
  };

  return (
    <div className="space-y-2">
      {type !== 'inline-select' && type !== 'mobile-select' && (
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      {type === 'inline-select' && (
        <div className="text-sm font-medium mb-2">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </div>
      )}

      {type === 'textarea' ? (
        <textarea
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`flex min-h-[100px] w-full rounded-lg border bg-input px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 resize-none ${hasError ? 'border-destructive focus-visible:ring-destructive' : 'border-input'
            }`}
        />
      ) : type === 'file' ? (
        <div className="relative">
          <input
            id={id}
            type="file"
            name={name}
            onChange={handleFileChange}
            disabled={disabled}
            accept={accept}
            className="hidden"
          />
          <label
            htmlFor={id}
            className={`flex items-center justify-center w-full min-h-[80px] rounded-lg border-2 border-dashed bg-muted cursor-pointer transition-colors hover:bg-muted/80 ${hasError ? 'border-destructive' : 'border-border'
              }`}
          >
            <div className="text-center py-4 px-3">
              <p className="text-sm font-medium text-foreground">Upload Bukti</p>
              <p className="text-xs text-muted-foreground mt-1">Tap untuk memilih gambar</p>
            </div>
          </label>
        </div>
      ) : type === 'inline-select' ? (
        <InlineSelect
          id={id}
          label={label}
          value={value}
          onChange={(newValue) => {
            const event = {
              target: {
                name,
                value: newValue,
              },
            } as React.ChangeEvent<HTMLSelectElement>;
            onChange?.(event);
          }}
          options={options}
          placeholder={`Pilih ${label}`}
          error={error}
          disabled={disabled}
          loading={loading}
        />
      ) : type === 'mobile-select' ? (
        <div className="space-y-2">
          <MobileSelect
            id={id}
            label={label}
            value={value}
            onChange={(newValue) => {
              const event = {
                target: {
                  name,
                  value: newValue,
                },
              } as React.ChangeEvent<HTMLSelectElement>;
              onChange?.(event);
            }}
            options={options}
            placeholder={`-- Pilih ${label} --`}
            error={error}
            disabled={disabled}
            loading={loading}
          />
        </div>
      ) : type === 'select' ? (
        <div className="relative">
          <select
            id={id}
            name={name}
            value={value}
            onChange={onChange}
            disabled={disabled || loading}
            className={`flex h-10 w-full rounded-lg border bg-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 appearance-none cursor-pointer pr-8 ${hasError ? 'border-destructive focus-visible:ring-destructive' : 'border-input'
              }`}
          >
            {loading ? (
              <option value="">Memuat dari spreadsheet...</option>
            ) : (
              <>
                <option value="">-- Pilih {label} --</option>
                {options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </>
            )}
          </select>
          {loading && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      ) : type === 'currency' ? (
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
            Rp
          </span>
          <Input
            id={id}
            type="text"
            inputMode="numeric"
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            className={`h-10 pl-9 ${hasError ? 'border-destructive focus-visible:ring-destructive' : ''
              }`}
          />
        </div>
      ) : (
        <Input
          id={id}
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`h-10 ${hasError ? 'border-destructive focus-visible:ring-destructive' : ''
            }`}
        />
      )}

      {children}

      {hasError && <p className="text-xs text-destructive font-medium">{error}</p>}
    </div>
  );
}
