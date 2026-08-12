/**
 * Expense Form State Management Hook
 * Handles form state, validation, and submission for expense tracking
 * Data submission goes to Google Sheets via Google Apps Script
 * v2 – mendukung multi-upload foto bukti (maks 5 foto)
 */

import { useState, useCallback } from 'react';
import { submitExpenseData, saveDraftLocally, ExpensePayload } from './api';

/** Jumlah maksimum foto bukti per transaksi */
export const MAX_BUKTI_FILES = 5;

export type FormErrors = Partial<Record<keyof ExpensePayload, string>>;

const INITIAL_STATE: ExpensePayload = {
  tanggal: '',
  proyek: '',
  kategori: '',
  jenis: 'Pengeluaran', // Default value
  nominal: '',
  metode: '',
  pic: '',
  deskripsi: '',
  catatan: '',
  user_input: '',
  bukti: '',
};

/**
 * Validation rules for expense form
 */
const validators: Partial<Record<keyof ExpensePayload, (value: string) => string>> = {
  tanggal: (value) => {
    if (!value?.trim()) return 'Tanggal harus dipilih';
    return '';
  },
  proyek: (value) => {
    if (!value?.trim()) return 'Proyek harus dipilih';
    return '';
  },
  kategori: (value) => {
    if (!value?.trim()) return 'Kategori harus dipilih';
    return '';
  },
  jenis: (value) => {
    if (!value?.trim()) return 'Jenis harus dipilih';
    return '';
  },
  nominal: (value) => {
    if (!value?.trim()) return 'Nominal harus diisi';
    const num = parseFloat(value.replace(/,/g, ''));
    if (isNaN(num)) return 'Nominal harus berupa angka';
    if (num <= 0) return 'Nominal harus lebih dari 0';
    return '';
  },
  metode: (value) => {
    if (!value?.trim()) return 'Metode pembayaran harus dipilih';
    return '';
  },
  pic: (value) => {
    if (!value?.trim()) return 'PIC harus dipilih';
    return '';
  },
  deskripsi: (value) => {
    if (!value?.trim()) return 'Deskripsi harus diisi';
    if (value.trim().length < 5) return 'Deskripsi minimal 5 karakter';
    return '';
  },
  // user_input diisi otomatis (tidak perlu validasi manual)
};

export function useExpense() {
  const [form, setForm] = useState<ExpensePayload>(INITIAL_STATE);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Multi-file upload state
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]); // base64 untuk preview thumbnail

  const [submitStatus, setSubmitStatus] = useState<{
    type: 'success' | 'error' | 'warning' | null;
    message: string;
  }>({
    type: null,
    message: '',
  });

  /**
   * Compress image and convert to base64
   */
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          const MAX_SIZE = 800; // Kompresi ekstra agar ukuran jadi sekitar 100KB
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(event.target?.result as string);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.5); // Kualitas diturunkan ke 50% untuk ukuran super kecil
          const originalLength = (event.target?.result as string).length;

          resolve(compressedBase64.length < originalLength ? compressedBase64 : event.target?.result as string);
        };
        img.onerror = () => resolve(event.target?.result as string);
      };
      reader.onerror = reject;
    });
  };

  /**
   * Validate single field
   */
  const validateField = useCallback((name: keyof ExpensePayload, value: string): string => {
    const validator = validators[name];
    return validator ? validator(value) : '';
  }, []);

  /**
   * Handle field change
   */
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value } = e.target;

      let finalValue = value;
      // Format number to Rupiah for nominal
      if (name === 'nominal') {
        const numericStr = value.replace(/[^0-9]/g, '');
        if (numericStr) {
          finalValue = parseInt(numericStr, 10).toLocaleString('en-US');
        } else {
          finalValue = '';
        }
      }

      setForm((prev) => ({ ...prev, [name]: finalValue }));

      // Clear error when user starts typing
      if (errors[name as keyof FormErrors]) {
        setErrors((prev) => ({ ...prev, [name]: '' }));
      }
    },
    [errors]
  );

  /**
   * Generate thumbnail preview (lebih kecil dari kompresi submit, hanya untuk tampilan)
   */
  const generatePreview = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_PREVIEW = 200; // thumbnail kecil
          let w = img.width;
          let h = img.height;
          if (w > h) {
            if (w > MAX_PREVIEW) { h = h * MAX_PREVIEW / w; w = MAX_PREVIEW; }
          } else {
            if (h > MAX_PREVIEW) { w = w * MAX_PREVIEW / h; h = MAX_PREVIEW; }
          }
          canvas.width = w;
          canvas.height = h;
          canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
        img.onerror = () => resolve(e.target?.result as string);
      };
      reader.onerror = () => resolve('');
    });
  };

  /**
   * Tambahkan foto-foto baru ke daftar upload
   */
  const handleAddFiles = useCallback(
    async (newFiles: File[]) => {
      const combined = [...uploadedFiles, ...newFiles].slice(0, MAX_BUKTI_FILES);
      setUploadedFiles(combined);
      // Generate preview untuk file baru saja
      const newPreviews = await Promise.all(newFiles.map(generatePreview));
      setFilePreviews((prev) => [...prev, ...newPreviews].slice(0, MAX_BUKTI_FILES));
      if (errors.bukti) setErrors((prev) => ({ ...prev, bukti: '' }));
    },
    [uploadedFiles, errors]
  );

  /**
   * Hapus foto dari daftar berdasarkan index
   */
  const handleRemoveFile = useCallback(
    (index: number) => {
      setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
      setFilePreviews((prev) => prev.filter((_, i) => i !== index));
    },
    []
  );

  /**
   * Validate all required fields
   */
  const validateAll = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    (Object.keys(form) as Array<keyof ExpensePayload>).forEach((key) => {
      // bukti, catatan, dan user_input adalah opsional / diisi otomatis
      if (key === 'bukti' || key === 'catatan' || key === 'user_input') return;

      const error = validateField(key, form[key]);
      if (error) {
        newErrors[key] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [form, validateField]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (!validateAll()) {
        setSubmitStatus({
          type: 'error',
          message: 'Mohon lengkapi semua field yang diperlukan',
        });
        return;
      }

      setIsSubmitting(true);
      setSubmitStatus({ type: null, message: '' });

      try {
        // Kompres semua file lalu gabung dengan separator '||'
        let buktiData = '';
        if (uploadedFiles.length > 0) {
          const compressed = await Promise.all(uploadedFiles.map(fileToBase64));
          buktiData = compressed.join('||');
        }

        const payload: ExpensePayload = {
          ...form,
          // Remove comma formatting before sending payload
          nominal: form.nominal.replace(/,/g, ''),
          bukti: buktiData,
          // user_input diisi otomatis jika kosong
          user_input: form.user_input || 'Web App',
        };

        const result = await submitExpenseData(payload);

        if (result.success) {
          setSubmitStatus({
            type: 'success',
            message: result.message || 'Transaksi berhasil disimpan ke spreadsheet!',
          });
          setForm(INITIAL_STATE);
          setUploadedFiles([]);
          setFilePreviews([]);

          // Clear status after 5 seconds
          setTimeout(() => {
            setSubmitStatus({ type: null, message: '' });
          }, 5000);
        } else if (result.maybeSubmitted) {
          // Timeout — data mungkin sudah masuk, reset form agar tidak kirim ulang
          setSubmitStatus({
            type: 'warning',
            message: result.error || 'Koneksi habis waktu. Data Anda kemungkinan sudah tersimpan — silakan cek Riwayat Transaksi untuk memastikan.',
          });
          setForm(INITIAL_STATE);
          setUploadedFiles([]);
          setFilePreviews([]);
        } else {
          // Jika offline, simpan sebagai draft
          if (!navigator.onLine) {
            saveDraftLocally(payload);
            setSubmitStatus({
              type: 'error',
              message: 'Anda sedang offline. Transaksi tersimpan sebagai draft dan akan dikirim saat online.',
            });
          } else {
            setSubmitStatus({
              type: 'error',
              message: result.error || 'Gagal menyimpan transaksi. Silakan coba lagi.',
            });
          }
        }
      } catch (error) {
        // Simpan sebagai draft jika offline
        if (!navigator.onLine) {
          saveDraftLocally({ ...form, bukti: '' });
          setSubmitStatus({
            type: 'error',
            message: 'Anda sedang offline. Transaksi tersimpan sebagai draft.',
          });
        } else {
          setSubmitStatus({
            type: 'error',
            message: 'Terjadi kesalahan. Silakan coba lagi.',
          });
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [form, validateAll, uploadedFiles]
  );

  /**
   * Reset form ke kondisi awal
   */
  const resetForm = useCallback(() => {
    setForm(INITIAL_STATE);
    setUploadedFiles([]);
    setFilePreviews([]);
    setErrors({});
    setSubmitStatus({ type: null, message: '' });
  }, []);

  return {
    form,
    setForm,
    errors,
    setErrors,
    isSubmitting,
    submitStatus,
    uploadedFiles,
    filePreviews,
    handleChange,
    handleAddFiles,
    handleRemoveFile,
    handleSubmit,
    validateField,
    resetForm,
  };
}
