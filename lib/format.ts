/**
 * Format utility functions for expense app
 */

/**
 * Format number as Indonesian Rupiah currency
 */
export function formatCurrency(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return 'Rp 0';

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Format date to Indonesian format
 */
export function formatDate(dateString: string): string {
  if (!dateString) return '';

  const date = new Date(dateString);
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

/**
 * Format date for API (ISO 8601)
 */
export function formatDateISO(dateString: string): string {
  if (!dateString) return '';
  return new Date(dateString).toISOString().split('T')[0];
}

/**
 * Parse number from input field
 */
export function parseInputNumber(value: string): number {
  const cleanValue = value.replace(/[^0-9]/g, '');
  return parseInt(cleanValue, 10) || 0;
}

/**
 * Format date for input[type="date"]
 */
export function formatDateForInput(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
