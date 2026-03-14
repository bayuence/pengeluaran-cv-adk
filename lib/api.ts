/**
 * API Service Layer
 * Handles all API calls to Google Apps Script with error handling and retry logic
 * All data (dropdowns, submissions) comes from Google Sheets via Google Apps Script
 */

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ExpensePayload {
  tanggal: string;
  proyek: string;
  kategori: string;
  nominal: string;
  metode: string;
  pic: string;
  deskripsi: string;
  catatan: string;
  user_input: string;
  bukti: string; // base64 or URL
}

// Google Apps Script API endpoint (wajib dikonfigurasi di .env)
const API_ENDPOINT = process.env.NEXT_PUBLIC_GAS_API_ENDPOINT || 'https://script.google.com/macros/s/AKfycbzQC9754A8-7tMKMnHTsDHsun2NSyTrOzrDUH-mpgNZJaR9z7UnWpU_OX5B_EQZwcLr/exec';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

/**
 * Retry logic for failed API calls
 */
async function retryFetch(
  url: string,
  options: RequestInit,
  retries = MAX_RETRIES
): Promise<Response> {
  try {
    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(15000), // 15s timeout
    });

    if (!response.ok && retries > 0 && response.status >= 500) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      return retryFetch(url, options, retries - 1);
    }

    return response;
  } catch (error) {
    if (retries > 0 && error instanceof Error && error.name !== 'AbortError') {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      return retryFetch(url, options, retries - 1);
    }
    throw error;
  }
}

/**
 * Fetch dropdown options from Google Apps Script API
 * tipe dapat berupa: "proyek", "Kategori", "Metode", "PIC"
 * Melempar error jika API tidak dikonfigurasi atau gagal — tidak ada fallback data
 */
export async function fetchDropdownOptions(
  tipe: string
): Promise<ApiResponse<string[]>> {
  if (!API_ENDPOINT) {
    return {
      success: false,
      error: 'API endpoint belum dikonfigurasi. Silakan set NEXT_PUBLIC_GAS_API_ENDPOINT di file .env',
    };
  }

  try {
    const response = await retryFetch(
      `${API_ENDPOINT}?action=getOptions&tipe=${encodeURIComponent(tipe)}`,
      {
        method: 'GET',
        // Tidak mengirimkan header custom (seperti Accept) untuk menghindari CORS preflight
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Handle format respons dari Code.gs user: { master: [...], proyek: [...] }
    let options: string[] = [];

    if (data && data.master && data.proyek) {
      if (tipe.toLowerCase() === 'proyek') {
        options = data.proyek
          .filter((p: any) => p.status !== 'Nonaktif') // opsional: abaikan yang nonaktif
          .map((p: any) => p.nama_proyek)
          .filter(Boolean);
      } else {
        options = data.master
          .filter((m: any) => m.tipe && m.tipe.toLowerCase() === tipe.toLowerCase())
          .map((m: any) => m.nama)
          .filter(Boolean);
      }
    } else {
      // Fallback untuk format array lama
      options = Array.isArray(data)
        ? data
        : data.options || data.data || [];
    }

    if (!Array.isArray(options)) {
      throw new Error(`Format respons tidak valid untuk tipe: ${tipe}`);
    }

    return {
      success: true,
      data: options,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal mengambil data dari spreadsheet';
    console.error(`[API] fetchDropdownOptions gagal untuk "${tipe}":`, message);
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Submit expense data ke Google Apps Script → Google Sheets
 * Tidak ada fallback ke localStorage untuk data submission
 */
export async function submitExpenseData(
  payload: ExpensePayload
): Promise<ApiResponse<{ id: string; timestamp: string }>> {
  // Validate required fields
  const requiredFields: (keyof ExpensePayload)[] = [
    'tanggal', 'proyek', 'kategori', 'nominal', 'metode', 'pic', 'deskripsi', 'user_input',
  ];
  for (const field of requiredFields) {
    if (!payload[field]) {
      return { success: false, error: `Field wajib kosong: ${field}` };
    }
  }

  // Validate nominal
  const nominalNum = parseFloat(payload.nominal);
  if (isNaN(nominalNum) || nominalNum <= 0) {
    return { success: false, error: 'Nominal harus berupa angka positif' };
  }

  if (!API_ENDPOINT) {
    return {
      success: false,
      error: 'API endpoint belum dikonfigurasi. Silakan set NEXT_PUBLIC_GAS_API_ENDPOINT di file .env',
    };
  }

  try {
    const response = await retryFetch(`${API_ENDPOINT}?action=submit`, {
      method: 'POST',
      // Menggunakan text/plain agar browser menganggap ini "simple request" dan tidak mengirim CORS preflight (OPTIONS)
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'submit',
        ...payload,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();

    return {
      success: true,
      data: {
        id: data.id || `expense-${Date.now()}`,
        timestamp: data.timestamp || new Date().toISOString(),
      },
      message: 'Transaksi berhasil disimpan ke spreadsheet',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal menyimpan transaksi';
    console.error('[API] submitExpenseData gagal:', message);
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Simpan draft lokal saat offline (hanya untuk offline support)
 */
export function saveDraftLocally(payload: ExpensePayload): void {
  try {
    const drafts = JSON.parse(localStorage.getItem('expense_drafts') || '[]');
    drafts.push({
      ...payload,
      savedAt: new Date().toISOString(),
    });
    localStorage.setItem('expense_drafts', JSON.stringify(drafts));
  } catch (error) {
    console.error('[API] saveDraftLocally gagal:', error);
  }
}

export function getDraftLocally(): Array<ExpensePayload & { savedAt?: string }> {
  try {
    const drafts = JSON.parse(localStorage.getItem('expense_drafts') || '[]');
    return Array.isArray(drafts) ? drafts : [];
  } catch {
    return [];
  }
}

export function clearDraftsLocally(): void {
  try {
    localStorage.removeItem('expense_drafts');
  } catch (error) {
    console.error('[API] clearDraftsLocally gagal:', error);
  }
}

export function getLocalDraftCount(): number {
  try {
    return getDraftLocally().length;
  } catch {
    return 0;
  }
}
