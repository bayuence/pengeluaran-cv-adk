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
  maybeSubmitted?: boolean; // true jika timeout — data mungkin sudah tersimpan di GAS
}

export interface ExpensePayload {
  tanggal: string;
  proyek: string;
  kategori: string;
  jenis: string; // 'Pemasukan' | 'Pengeluaran'
  nominal: string;
  metode: string;
  pic: string;
  deskripsi: string;
  catatan: string;
  user_input: string;
  bukti: string; // base64 or URL
}

export interface HistoryItem {
  id: string;
  tanggal: string;
  proyek: string;
  kategori: string;
  deskripsi: string;
  nominal: number;
  metode: string;
  pic: string;
  catatan: string;
  bukti: string;
  timestamp: string;
  user: string;
}

// API Proxy endpoint (lokal, bypass CORS)
// Proxy ini akan forward request ke Google Apps Script
const API_ENDPOINT = '/api/gas';
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
      redirect: 'follow', // Important for Google Apps Script redirects
      signal: AbortSignal.timeout(9000), // 9s timeout (server proxy timeout = 8s)
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
 * Fetch SEMUA dropdown options dalam 1 request ke proxy (lebih efisien)
 * Mengembalikan proyek, kategori, metode, dan pic sekaligus
 */
export async function fetchAllDropdownOptions(): Promise<{
  proyek: ApiResponse<string[]>;
  kategori: ApiResponse<string[]>;
  metode: ApiResponse<string[]>;
  pic: ApiResponse<string[]>;
}> {
  const empty = (error: string): ApiResponse<string[]> => ({ success: false, error });

  if (!API_ENDPOINT) {
    const err = 'API endpoint belum dikonfigurasi. Silakan set NEXT_PUBLIC_GAS_API_ENDPOINT di file .env';
    return { proyek: empty(err), kategori: empty(err), metode: empty(err), pic: empty(err) };
  }

  try {
    const response = await retryFetch(`${API_ENDPOINT}?action=getAllOptions`, { method: 'GET' });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    const raw = result.data; // { master: [...], proyek: [...] }

    const parseProyek = (): ApiResponse<string[]> => {
      if (!raw?.proyek) return empty('Data proyek tidak tersedia');
      const opts = raw.proyek
        .filter((p: any) => p.status !== 'Nonaktif')
        .map((p: any) => p.nama_proyek)
        .filter(Boolean);
      return { success: true, data: opts };
    };

    const parseMaster = (tipe: string): ApiResponse<string[]> => {
      if (!raw?.master) return empty(`Data ${tipe} tidak tersedia`);
      const opts = raw.master
        .filter((m: any) => m.tipe && m.tipe.toLowerCase() === tipe.toLowerCase())
        .map((m: any) => m.nama)
        .filter(Boolean);
      return { success: true, data: opts };
    };

    return {
      proyek: parseProyek(),
      kategori: parseMaster('kategori'),
      metode: parseMaster('metode'),
      pic: parseMaster('pic'),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal mengambil data dari spreadsheet';
    console.error('[API] fetchAllDropdownOptions gagal:', message);
    return {
      proyek: empty(message),
      kategori: empty(message),
      metode: empty(message),
      pic: empty(message),
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
    'tanggal', 'proyek', 'kategori', 'jenis', 'nominal', 'metode', 'pic', 'deskripsi', 'user_input',
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
    // PENTING: gunakan fetch biasa (BUKAN retryFetch) untuk submit
    // POST tidak idempotent — retry menyebabkan data duplikat di spreadsheet
    const response = await fetch(`${API_ENDPOINT}?action=submit`, {
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
      redirect: 'follow',
      signal: AbortSignal.timeout(9000),
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
    const isTimeout =
      error instanceof Error &&
      (error.name === 'AbortError' || error.name === 'TimeoutError' || error.message.includes('timeout'));

    if (isTimeout) {
      // Koneksi timeout — GAS mungkin sudah menyimpan data tapi respons terlambat.
      // Tunggu 4 detik lalu verifikasi otomatis dengan query history terbaru.
      console.warn('[API] Submit timeout — memulai auto-verifikasi...');
      await new Promise((resolve) => setTimeout(resolve, 4000));

      try {
        const verifyRes = await fetch(`${API_ENDPOINT}?action=getHistory&limit=5`, {
          method: 'GET',
          redirect: 'follow',
          signal: AbortSignal.timeout(8000),
        });

        if (verifyRes.ok) {
          const verifyData = await verifyRes.json();
          const items: Array<Record<string, unknown>> = verifyData?.data ?? [];

          // Cocokkan data yang baru dikirim dengan history terbaru
          const nominalNum = parseFloat(payload.nominal.replace(/,/g, ''));
          const submittedDate = payload.tanggal; // format: YYYY-MM-DD

          const match = items.find((item) => {
            const itemNominal = typeof item.nominal === 'number' ? item.nominal : parseFloat(String(item.nominal));
            const itemTanggal = String(item.tanggal ?? '').substring(0, 10);
            return (
              itemTanggal === submittedDate &&
              itemNominal === nominalNum &&
              String(item.proyek ?? '') === payload.proyek &&
              String(item.deskripsi ?? '') === payload.deskripsi
            );
          });

          if (match) {
            console.log('[API] Auto-verifikasi: data DITEMUKAN di spreadsheet ✓');
            return {
              success: true,
              data: {
                id: String(match.id ?? `expense-${Date.now()}`),
                timestamp: String(match.timestamp ?? new Date().toISOString()),
              },
              message: 'Transaksi berhasil disimpan ke spreadsheet',
            };
          } else {
            console.warn('[API] Auto-verifikasi: data TIDAK ditemukan di spreadsheet ✗');
            return {
              success: false,
              error: 'Koneksi lambat dan data tidak terverifikasi tersimpan. Silakan coba kirim ulang.',
            };
          }
        }
      } catch (verifyError) {
        console.error('[API] Auto-verifikasi gagal:', verifyError);
      }

      // Verifikasi sendiri gagal (GAS tidak bisa diakses sama sekali)
      return {
        success: false,
        error: 'Koneksi ke server bermasalah. Silakan periksa koneksi internet Anda dan coba lagi.',
      };
    }

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

/**
 * Fetch transaction history from Google Apps Script
 */
export async function fetchHistory(
  limit = 50,
  offset = 0,
  proyek?: string,
  kategori?: string
): Promise<ApiResponse<HistoryItem[]>> {
  if (!API_ENDPOINT) {
    return {
      success: false,
      error: 'API endpoint belum dikonfigurasi',
    };
  }

  try {
    const params = new URLSearchParams({
      action: 'getHistory',
      limit: String(limit),
      offset: String(offset),
    });
    if (proyek) params.append('proyek', proyek);
    if (kategori) params.append('kategori', kategori);

    const response = await retryFetch(`${API_ENDPOINT}?${params.toString()}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[API] getHistory response:', data); // Debug log

    if (data.success && Array.isArray(data.data)) {
      return {
        success: true,
        data: data.data,
      };
    }

    throw new Error(data.error || `Format respons tidak valid: ${JSON.stringify(data).slice(0, 200)}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal mengambil riwayat transaksi';
    console.error('[API] fetchHistory gagal:', message);
    return {
      success: false,
      error: message,
    };
  }
}
