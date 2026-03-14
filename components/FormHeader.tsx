/**
 * Form Header Component
 * Clean header with title and description for expense tracking PWA
 */

import Image from 'next/image';

export function FormHeader() {
  return (
    <div className="space-y-4 mb-8 flex flex-col items-center text-center">
      <div className="relative w-24 h-24 mb-2">
        <Image
          src="/adk-logo.png"
          alt="Logo CV Akbar Dharma Karya"
          fill
          className="object-contain"
          priority
        />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">CV Akbar Dharma Karya</h1>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
          Input Pengeluaran Proyek - Catat pengeluaran dengan cepat dan mudah. Data Anda aman tersimpan.
        </p>
      </div>
    </div>
  );
}
