'use client';

/**
 * Expense Submission Form Component
 * Mobile-first, responsive form for construction company expense tracking
 * Optimized for PWA on Android and iOS
 * All dropdown data fetched from Google Sheets via Google Apps Script
 */

import { useState, useEffect } from 'react';
import { FormHeader } from './FormHeader';
import { FormField } from './FormField';
import { StatusMessage } from './StatusMessage';
import { Button } from '@/components/ui/button';
import { useExpense } from '@/lib/useExpense';
import { fetchDropdownOptions } from '@/lib/api';
import { Loader2, AlertTriangle } from 'lucide-react';

interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownData {
  proyek: DropdownOption[];
  kategori: DropdownOption[];
  metode: DropdownOption[];
  pic: DropdownOption[];
}

interface DropdownError {
  proyek?: string;
  kategori?: string;
  metode?: string;
  pic?: string;
}

export function ExpenseForm() {
  const {
    form,
    errors,
    isSubmitting,
    submitStatus,
    uploadedFile,
    handleChange,
    handleFileChange,
    handleSubmit,
    resetForm,
  } = useExpense();

  const [dropdowns, setDropdowns] = useState<DropdownData>({
    proyek: [],
    kategori: [],
    metode: [],
    pic: [],
  });

  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(true);
  const [dropdownErrors, setDropdownErrors] = useState<DropdownError>({});

  // Fetch semua data dropdown dari Google Apps Script saat pertama render
  useEffect(() => {
    async function loadDropdowns() {
      setIsLoadingDropdowns(true);
      setDropdownErrors({});

      const [proyekRes, kategoriRes, metodeRes, picRes] = await Promise.all([
        fetchDropdownOptions('proyek'),
        fetchDropdownOptions('Kategori'),
        fetchDropdownOptions('Metode'),
        fetchDropdownOptions('PIC'),
      ]);

      const newDropdowns: DropdownData = {
        proyek: [],
        kategori: [],
        metode: [],
        pic: [],
      };
      const newErrors: DropdownError = {};

      if (proyekRes.success && proyekRes.data) {
        newDropdowns.proyek = proyekRes.data.map((item) => ({ value: item, label: item }));
      } else {
        newErrors.proyek = proyekRes.error;
      }

      if (kategoriRes.success && kategoriRes.data) {
        newDropdowns.kategori = kategoriRes.data.map((item) => ({ value: item, label: item }));
      } else {
        newErrors.kategori = kategoriRes.error;
      }

      if (metodeRes.success && metodeRes.data) {
        newDropdowns.metode = metodeRes.data.map((item) => ({ value: item, label: item }));
      } else {
        newErrors.metode = metodeRes.error;
      }

      if (picRes.success && picRes.data) {
        newDropdowns.pic = picRes.data.map((item) => ({ value: item, label: item }));
      } else {
        newErrors.pic = picRes.error;
      }

      setDropdowns(newDropdowns);
      setDropdownErrors(newErrors);
      setIsLoadingDropdowns(false);
    }

    loadDropdowns();
  }, []);

  const hasDropdownErrors = Object.keys(dropdownErrors).length > 0;
  const fileName = uploadedFile ? uploadedFile.name : '';

  return (
    <div className="w-full bg-background/70 flex flex-col rounded-[2rem] border border-white/60 shadow-[0_25px_80px_-45px_rgba(28,25,23,0.35)] backdrop-blur-sm">
      {/* Safe area padding for mobile notch */}
      <div className="flex-1 flex flex-col pt-safe pb-safe">
        {/* Header section */}
        <div className="px-4 pt-6 sm:px-6 md:px-8">
          <FormHeader />
        </div>

        {/* Form section */}
        <div className="flex-1 px-4 sm:px-6 md:px-8">
          {/* API error banner */}
          {hasDropdownErrors && !isLoadingDropdowns && (
            <div className="flex items-start gap-3 bg-destructive/10 text-destructive p-3 rounded-lg border border-destructive/30 mb-4 mt-2">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-sm">
                <p className="font-medium mb-1">Gagal memuat data dari spreadsheet</p>
                {dropdownErrors.proyek && <p className="text-xs opacity-90">• Proyek: {dropdownErrors.proyek}</p>}
                {dropdownErrors.kategori && <p className="text-xs opacity-90">• Kategori: {dropdownErrors.kategori}</p>}
                {dropdownErrors.metode && <p className="text-xs opacity-90">• Metode: {dropdownErrors.metode}</p>}
                {dropdownErrors.pic && <p className="text-xs opacity-90">• PIC: {dropdownErrors.pic}</p>}
                <p className="text-xs mt-2 opacity-75">
                  Pastikan <code className="font-mono bg-destructive/20 px-1 rounded">NEXT_PUBLIC_GAS_API_ENDPOINT</code> sudah dikonfigurasi di file <code className="font-mono bg-destructive/20 px-1 rounded">.env</code>
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6 pb-8" noValidate>
            {/* Status Messages */}
            {submitStatus.type && (
              <StatusMessage type={submitStatus.type} message={submitStatus.message} />
            )}

            {/* Form Fields */}
            <div className="space-y-4">
              {/* Tanggal */}
              <FormField
                id="tanggal"
                label="Tanggal"
                name="tanggal"
                type="date"
                value={form.tanggal}
                error={errors.tanggal}
                onChange={handleChange}
                required
              />

              {/* Proyek */}
              <FormField
                id="proyek"
                label="Proyek"
                name="proyek"
                type="select"
                value={form.proyek}
                error={errors.proyek || dropdownErrors.proyek}
                onChange={handleChange}
                required
                disabled={isLoadingDropdowns}
                options={dropdowns.proyek}
                loading={isLoadingDropdowns}
              />

              {/* Kategori */}
              <FormField
                id="kategori"
                label="Kategori"
                name="kategori"
                type="select"
                value={form.kategori}
                error={errors.kategori || dropdownErrors.kategori}
                onChange={handleChange}
                required
                disabled={isLoadingDropdowns}
                options={dropdowns.kategori}
                loading={isLoadingDropdowns}
              />

              {/* Nominal */}
              <FormField
                id="nominal"
                label="Nominal"
                name="nominal"
                type="currency"
                placeholder="0"
                value={form.nominal}
                error={errors.nominal}
                onChange={handleChange}
                required
              />

              {/* Metode Pembayaran */}
              <FormField
                id="metode"
                label="Metode Pembayaran"
                name="metode"
                type="select"
                value={form.metode}
                error={errors.metode || dropdownErrors.metode}
                onChange={handleChange}
                required
                disabled={isLoadingDropdowns}
                options={dropdowns.metode}
                loading={isLoadingDropdowns}
              />

              {/* PIC */}
              <FormField
                id="pic"
                label="PIC"
                name="pic"
                type="select"
                value={form.pic}
                error={errors.pic || dropdownErrors.pic}
                onChange={handleChange}
                required
                disabled={isLoadingDropdowns}
                options={dropdowns.pic}
                loading={isLoadingDropdowns}
              />

              {/* Deskripsi */}
              <FormField
                id="deskripsi"
                label="Deskripsi"
                name="deskripsi"
                type="text"
                placeholder="Jelaskan pengeluaran ini..."
                value={form.deskripsi}
                error={errors.deskripsi}
                onChange={handleChange}
                required
              />

              {/* Catatan - Optional */}
              <FormField
                id="catatan"
                label="Catatan Tambahan"
                name="catatan"
                type="textarea"
                placeholder="Catatan (opsional)..."
                value={form.catatan}
                error={errors.catatan}
                onChange={handleChange}
                required={false}
              />

              {/* Nama Pengguna */}
              <FormField
                id="user_input"
                label="Nama Pengguna"
                name="user_input"
                type="text"
                placeholder="Siapa yang input data ini?"
                value={form.user_input}
                error={errors.user_input}
                onChange={handleChange}
                required
              />

              {/* Upload Bukti */}
              <FormField
                id="bukti"
                label="Upload Bukti"
                name="bukti"
                type="file"
                onFileChange={handleFileChange}
                required={false}
                accept="image/*"
              >
                {fileName && (
                  <p className="text-xs text-muted-foreground mt-2">
                    File dipilih: {fileName}
                  </p>
                )}
              </FormField>
            </div>

            {/* Submit Button */}
            <div className="flex flex-col gap-2 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting || isLoadingDropdowns}
                className="w-full h-12 text-base font-semibold flex items-center justify-center gap-2 rounded-lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Menyimpan ke Spreadsheet...</span>
                  </>
                ) : isLoadingDropdowns ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Memuat Data...</span>
                  </>
                ) : (
                  <span>Simpan Transaksi</span>
                )}
              </Button>

              {submitStatus.type === 'success' && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  className="w-full h-12 text-base font-semibold rounded-lg"
                >
                  Input Transaksi Baru
                </Button>
              )}
            </div>

            {/* Helper Text */}
            <p className="text-xs text-muted-foreground text-center pt-2">
              Semua field bertanda * wajib diisi. Data disimpan langsung ke Google Sheets.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
