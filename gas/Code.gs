// ═══════════════════════════════════════════════════════════════
// CV AKBAR DHARMA KARYA — Google Apps Script
// Sistem Pencatatan Pengeluaran
// Versi: 2.0 (Multi-Foto Bukti)
// Update: Support upload beberapa bukti foto per transaksi
//         Field bukti disimpan sebagai URL dipisahkan '||'
// ═══════════════════════════════════════════════════════════════

const SHEET_DASHBOARD  = "Dashboard";
const SHEET_TRANSAKSI  = "Transaksi";
const SHEET_PENGATURAN = "Pengaturan";
const SHEET_SISTEM     = "Sistem";

const FOLDER_ID = "1aG5WtWv99i0NWfS2mbvZRXnIJ6CnyyCg";

// Posisi kolom di sheet Pengaturan (horizontal layout)
const PENGATURAN = {
  PROYEK:   { startCol: 1,  cols: ["Nama_Proyek", "Klien", "Lokasi", "Status"] },
  KATEGORI: { startCol: 6,  cols: ["Nama", "Status"] },
  METODE:   { startCol: 9,  cols: ["Nama", "Status"] },
  PIC:      { startCol: 12, cols: ["Nama", "Status"] }
};

// ═══════════════════════════════════════════════════════════════
// ENTRY POINTS
// ═══════════════════════════════════════════════════════════════

function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu("CVADK Tools")
      .addItem("Setup Spreadsheet", "setupSheets")
      .addItem("Refresh Dashboard",  "refreshDashboard")
      .addToUi();
  } catch (e) {}
}

function doGet(e) {
  const ss     = SpreadsheetApp.getActiveSpreadsheet();
  const action = e && e.parameter ? String(e.parameter.action || "") : "";

  if (action === "getOptions") {
    return ContentService
      .createTextOutput(JSON.stringify(buildOptionData(ss)))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (action === "getHistory") {
    const limit    = Number(e.parameter.limit)    || 50;
    const offset   = Number(e.parameter.offset)   || 0;
    const proyek   = String(e.parameter.proyek    || "");
    const kategori = String(e.parameter.kategori  || "");

    return ContentService
      .createTextOutput(JSON.stringify(getHistoryData(ss, limit, offset, proyek, kategori)))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (action === "ping") {
    return ContentService
      .createTextOutput(JSON.stringify({ success: true, message: "API aktif" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Default: return option data
  return ContentService
    .createTextOutput(JSON.stringify(buildOptionData(ss)))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const ss             = SpreadsheetApp.getActiveSpreadsheet();
    const transaksiSheet = ss.getSheetByName(SHEET_TRANSAKSI);
    const sistemSheet    = ss.getSheetByName(SHEET_SISTEM);
    const payload        = JSON.parse(e.postData.contents || "{}");
    const settings       = readSistemSettings(sistemSheet);

    validatePayload(ss, payload, settings);

    const id          = "TRX-" + new Date().getTime();
    const timestamp   = new Date();
    const nominal     = sanitizeNumber(payload.nominal);

    // ── MULTI-FOTO: processProofUpload sekarang bisa return beberapa URL
    //    dipisahkan '||' (contoh: "https://drive.../1||https://drive.../2")
    const imageUrl    = processProofUpload(payload, settings, id);
    const tanggalValue = parseDateInput(payload.tanggal);

    transaksiSheet.appendRow([
      id,                          // A  - ID
      tanggalValue,                // B  - Tanggal
      payload.proyek   || "",      // C  - Proyek
      payload.kategori || "",      // D  - Kategori
      payload.jenis    || "Pengeluaran", // E - Jenis
      payload.deskripsi || "",     // F  - Deskripsi
      nominal,                     // G  - Nominal
      payload.metode   || "",      // H  - Metode
      payload.pic      || "",      // I  - PIC
      payload.catatan  || "",      // J  - Catatan
      imageUrl,                    // K  - Bukti (bisa multi-URL, pisah '||')
      timestamp,                   // L  - Timestamp
      payload.user_input || ""     // M  - User
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({
        success:   true,
        id:        id,
        timestamp: timestamp.toISOString(),
        message:   "Transaksi berhasil disimpan"
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error:   error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ═══════════════════════════════════════════════════════════════
// SETUP SHEETS
// ═══════════════════════════════════════════════════════════════

function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const dashboard  = getOrCreateSheet(ss, SHEET_DASHBOARD);
  const transaksi  = getOrCreateSheet(ss, SHEET_TRANSAKSI);
  const pengaturan = getOrCreateSheet(ss, SHEET_PENGATURAN);
  const sistem     = getOrCreateSheet(ss, SHEET_SISTEM);

  setupTransaksiSheet(transaksi);
  setupPengaturanSheet(pengaturan);
  setupSistemSheet(sistem);
  refreshDashboard();

  SpreadsheetApp.getUi().alert("Setup selesai! Spreadsheet siap digunakan.");
}

function setupTransaksiSheet(sheet) {
  const headers = [
    "ID", "Tanggal", "Proyek", "Kategori", "Jenis",
    "Deskripsi", "Nominal", "Metode", "PIC", "Catatan",
    "Bukti", "Timestamp", "User"
  ];
  const current = sheet.getRange(1, 1, 1, headers.length).getValues()[0];

  if (current[0] !== headers[0]) {
    sheet.getRange(1, 1, 1, headers.length)
      .setValues([headers])
      .setFontWeight("bold")
      .setBackground("#1e293b")
      .setFontColor("#ffffff");
    sheet.setFrozenRows(1);
  }

  sheet.getRange("B:B").setNumberFormat("dd/MM/yyyy");
  sheet.getRange("G:G").setNumberFormat("#,##0");
  sheet.getRange("L:L").setNumberFormat("dd/MM/yyyy HH:mm");

  // Kolom Bukti (K): lebar cukup + wrap text agar tiap URL tampil di baris sendiri
  sheet.setColumnWidth(11, 280);
  sheet.getRange("K:K").setWrap(true).setVerticalAlignment("top");
}

function setupPengaturanSheet(sheet) {
  sheet.clear();

  sheet.getRange("A1").setValue("PROYEK")
    .setFontWeight("bold").setFontSize(12).setBackground("#3b82f6").setFontColor("#ffffff");
  sheet.getRange("F1").setValue("KATEGORI")
    .setFontWeight("bold").setFontSize(12).setBackground("#10b981").setFontColor("#ffffff");
  sheet.getRange("I1").setValue("METODE")
    .setFontWeight("bold").setFontSize(12).setBackground("#f59e0b").setFontColor("#ffffff");
  sheet.getRange("L1").setValue("PIC")
    .setFontWeight("bold").setFontSize(12).setBackground("#8b5cf6").setFontColor("#ffffff");

  sheet.getRange("A2:D2").setValues([["Nama_Proyek", "Klien", "Lokasi", "Status"]])
    .setFontWeight("bold").setBackground("#e2e8f0");
  sheet.getRange("F2:G2").setValues([["Nama", "Status"]])
    .setFontWeight("bold").setBackground("#e2e8f0");
  sheet.getRange("I2:J2").setValues([["Nama", "Status"]])
    .setFontWeight("bold").setBackground("#e2e8f0");
  sheet.getRange("L2:M2").setValues([["Nama", "Status"]])
    .setFontWeight("bold").setBackground("#e2e8f0");

  sheet.getRange("A3:D4").setValues([
    ["Rumah Pak Andi", "Pak Andi", "Surabaya", "Aktif"],
    ["Renovasi Kantor", "PT Maju",  "Sidoarjo", "Aktif"]
  ]);
  sheet.getRange("F3:G6").setValues([
    ["Material",  "Aktif"],
    ["Upah",      "Aktif"],
    ["Transport", "Aktif"],
    ["Inventory", "Aktif"]
  ]);
  sheet.getRange("I3:J5").setValues([
    ["Cash",     "Aktif"],
    ["Transfer", "Aktif"],
    ["QRIS",     "Aktif"]
  ]);
  sheet.getRange("L3:M4").setValues([
    ["Budi", "Aktif"],
    ["Andi", "Aktif"]
  ]);

  sheet.setColumnWidth(5,  20);
  sheet.setColumnWidth(8,  20);
  sheet.setColumnWidth(11, 20);
  sheet.setFrozenRows(2);
}

function setupSistemSheet(sheet) {
  const current = sheet.getRange("A1").getValue();
  if (current === "Setting") return;

  sheet.clear();
  sheet.getRange("A1:C1")
    .setValues([["Setting", "Value", "Keterangan"]])
    .setFontWeight("bold").setBackground("#1e293b").setFontColor("#ffffff");

  sheet.getRange("A2:C7").setValues([
    ["NamaPerusahaan", "CV Akbar Dharma Karya", "Nama perusahaan"],
    ["MataUang",       "IDR",                   "Currency"],
    ["FormatTanggal",  "DD/MM/YYYY",             "Format tanggal"],
    ["MaksNominal",    100000000,                "Limit nominal (0 = tanpa limit)"],
    ["UploadBukti",    "TRUE",                   "TRUE/FALSE aktifkan upload"],
    ["MaksBuktiFoto",  5,                        "Jumlah maksimal foto bukti per transaksi"]
  ]);

  sheet.setFrozenRows(1);
}

// ═══════════════════════════════════════════════════════════════
// READ DATA FROM PENGATURAN SHEET
// ═══════════════════════════════════════════════════════════════

function buildOptionData(ss) {
  const sheet = ss.getSheetByName(SHEET_PENGATURAN);
  if (!sheet) return { master: [], proyek: [] };

  const data = sheet.getDataRange().getValues();

  const proyekList = [];
  for (let i = 2; i < data.length; i++) {
    const nama   = String(data[i][0]  || "").trim();
    const status = String(data[i][3]  || "").trim().toLowerCase();
    if (nama && status === "aktif") {
      proyekList.push({
        nama_proyek: nama,
        klien:       String(data[i][1] || ""),
        lokasi:      String(data[i][2] || ""),
        status:      "Aktif"
      });
    }
  }

  const kategoriList = [];
  for (let i = 2; i < data.length; i++) {
    const nama   = String(data[i][5] || "").trim();
    const status = String(data[i][6] || "").trim().toLowerCase();
    if (nama && status === "aktif") {
      kategoriList.push({ tipe: "Kategori", nama: nama, status: "Aktif" });
    }
  }

  const metodeList = [];
  for (let i = 2; i < data.length; i++) {
    const nama   = String(data[i][8]  || "").trim();
    const status = String(data[i][9]  || "").trim().toLowerCase();
    if (nama && status === "aktif") {
      metodeList.push({ tipe: "Metode", nama: nama, status: "Aktif" });
    }
  }

  const picList = [];
  for (let i = 2; i < data.length; i++) {
    const nama   = String(data[i][11] || "").trim();
    const status = String(data[i][12] || "").trim().toLowerCase();
    if (nama && status === "aktif") {
      picList.push({ tipe: "PIC", nama: nama, status: "Aktif" });
    }
  }

  return {
    proyek: proyekList,
    master: [...kategoriList, ...metodeList, ...picList]
  };
}

function getHistoryData(ss, limit, offset, filterProyek, filterKategori) {
  const sheet = ss.getSheetByName(SHEET_TRANSAKSI);
  if (!sheet) return { success: false, error: "Sheet Transaksi tidak ditemukan" };

  const rows = sheet.getDataRange().getValues().slice(1).filter(r => r[0]);

  // Kolom: [0]ID [1]Tanggal [2]Proyek [3]Kategori [4]Jenis [5]Deskripsi
  //        [6]Nominal [7]Metode [8]PIC [9]Catatan [10]Bukti [11]Timestamp [12]User
  let filtered = rows.map(row => ({
    id:        String(row[0]  || ""),
    tanggal:   row[1] ? formatDateISO(row[1]) : "",
    proyek:    String(row[2]  || ""),
    kategori:  String(row[3]  || ""),
    jenis:     String(row[4]  || "Pengeluaran"),
    deskripsi: String(row[5]  || ""),
    nominal:   sanitizeNumber(row[6]),
    metode:    String(row[7]  || ""),
    pic:       String(row[8]  || ""),
    catatan:   String(row[9]  || ""),
    // bukti bisa berisi 1 URL atau beberapa URL dipisahkan '||'
    bukti:     String(row[10] || ""),
    timestamp: row[11] ? new Date(row[11]).toISOString() : "",
    user:      String(row[12] || "")
  }));

  if (filterProyek) {
    filtered = filtered.filter(t => t.proyek.toLowerCase() === filterProyek.toLowerCase());
  }
  if (filterKategori) {
    filtered = filtered.filter(t => t.kategori.toLowerCase() === filterKategori.toLowerCase());
  }

  filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return {
    success: true,
    data:    filtered.slice(offset, offset + limit),
    total:   filtered.length,
    limit:   limit,
    offset:  offset
  };
}

// ═══════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════

function validatePayload(ss, payload, settings) {
  const required = [
    "tanggal", "proyek", "kategori", "nominal",
    "metode", "pic", "deskripsi", "user_input"
  ];

  for (const field of required) {
    if (!String(payload[field] || "").trim()) {
      throw new Error("Field wajib kosong: " + field);
    }
  }

  const nominal = sanitizeNumber(payload.nominal);
  if (nominal <= 0) throw new Error("Nominal harus lebih dari 0");
  if (settings.maxNominal > 0 && nominal > settings.maxNominal) {
    throw new Error("Nominal melebihi batas maksimal");
  }

  const options = buildOptionData(ss);

  if (!options.proyek.some(p => p.nama_proyek.toLowerCase() === payload.proyek.toLowerCase())) {
    throw new Error("Proyek tidak ditemukan atau tidak aktif");
  }
  if (!options.master.some(m => m.tipe === "Kategori" && m.nama.toLowerCase() === payload.kategori.toLowerCase())) {
    throw new Error("Kategori tidak ditemukan atau tidak aktif");
  }
  if (!options.master.some(m => m.tipe === "Metode" && m.nama.toLowerCase() === payload.metode.toLowerCase())) {
    throw new Error("Metode tidak ditemukan atau tidak aktif");
  }
  if (!options.master.some(m => m.tipe === "PIC" && m.nama.toLowerCase() === payload.pic.toLowerCase())) {
    throw new Error("PIC tidak ditemukan atau tidak aktif");
  }
}

function readSistemSettings(sheet) {
  const defaults = {
    companyName:   "CV Akbar Dharma Karya",
    maxNominal:    0,
    uploadBukti:   true,
    maksBuktiFoto: 5
  };

  if (!sheet) return defaults;

  const rows = sheet.getDataRange().getValues().slice(1);
  for (const row of rows) {
    const key = String(row[0] || "");
    const val = row[1];
    if (key === "MaksNominal")    defaults.maxNominal    = sanitizeNumber(val);
    if (key === "UploadBukti")    defaults.uploadBukti   = String(val).toUpperCase() === "TRUE";
    if (key === "MaksBuktiFoto")  defaults.maksBuktiFoto = sanitizeNumber(val) || 5;
  }

  return defaults;
}

// ═══════════════════════════════════════════════════════════════
// UPLOAD BUKTI — MULTI-FOTO (v2)
// Mendukung beberapa foto per transaksi.
// Frontend mengirim field `bukti` berisi base64 image(s)
// dipisahkan dengan separator '||'
// Contoh 1 foto: "data:image/jpeg;base64,AAAA..."
// Contoh 2 foto: "data:image/jpeg;base64,AAAA...||data:image/jpeg;base64,BBBB..."
// Return value: URL Google Drive, dipisahkan '||' jika lebih dari 1
// ═══════════════════════════════════════════════════════════════

function processProofUpload(payload, settings, id) {
  if (!settings.uploadBukti) return "";
  if (!payload.bukti)        return "";

  try {
    const folder = DriveApp.getFolderById(FOLDER_ID);

    // Pecah berdasarkan separator '||' yang dikirim frontend
    const rawItems = payload.bukti
      .split("||")
      .map(function(s) { return s.trim(); })
      .filter(Boolean);

    // Hanya proses item yang memang base64 image
    const base64Items = rawItems.filter(function(item) {
      return item.indexOf("base64") !== -1;
    });

    if (base64Items.length === 0) return "";

    const urls = [];

    base64Items.forEach(function(item, index) {
      try {
        // Format: "data:image/jpeg;base64,XXXXXX"
        const commaIdx = item.indexOf(",");
        if (commaIdx === -1) {
          Logger.log("Foto " + (index + 1) + ": format tidak valid, dilewati");
          return;
        }

        const header = item.substring(0, commaIdx); // "data:image/jpeg;base64"
        const data   = item.substring(commaIdx + 1); // string base64 murni

        const mime = header.split(";")[0].replace("data:", "") || "image/jpeg";
        const ext  = mime.indexOf("png")  !== -1 ? "png"
                   : mime.indexOf("webp") !== -1 ? "webp"
                   : "jpg";

        // Suffix index agar nama file unik jika multi-foto
        const suffix   = base64Items.length > 1 ? "_" + (index + 1) : "";
        const filename = "Bukti_" + id + suffix + "." + ext;

        const blob = Utilities.newBlob(Utilities.base64Decode(data), mime, filename);
        const file = folder.createFile(blob);

        try {
          file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        } catch (sharingError) {
          Logger.log("Sharing error foto " + (index + 1) + ": " + sharingError.message);
        }

        urls.push(file.getUrl());
        Logger.log("Foto " + (index + 1) + " berhasil upload: " + file.getName());

      } catch (itemError) {
        // Jangan throw — lanjut ke foto berikutnya
        Logger.log("Gagal upload foto " + (index + 1) + ": " + itemError.message);
      }
    });

    if (urls.length === 0) return "Upload gagal: tidak ada foto yang berhasil diproses";

    // Kembalikan semua URL dipisahkan newline '\n'
    // → di Google Sheets tiap URL tampil di baris sendiri & bisa diklik langsung
    // → frontend parsing mendukung kedua format (\n dan ||) untuk backward compat
    return urls.join("\n");

  } catch (e) {
    return "Upload gagal: " + e.message;
  }
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════

function refreshDashboard() {
  const ss        = SpreadsheetApp.getActiveSpreadsheet();
  const dashboard = getOrCreateSheet(ss, SHEET_DASHBOARD);
  const transaksi = ss.getSheetByName(SHEET_TRANSAKSI);

  dashboard.clear();

  if (!transaksi) {
    dashboard.getRange("A1").setValue("Jalankan Setup terlebih dahulu");
    return;
  }

  const rows    = transaksi.getDataRange().getValues().slice(1).filter(r => r[0]);
  const today   = new Date();
  const todayStr = Utilities.formatDate(today, Session.getScriptTimeZone(), "yyyy-MM-dd");

  let totalNominal = 0;
  let totalHariIni = 0;
  const byKategori = {};
  const byProyek   = {};
  const byMetode   = {};

  for (const row of rows) {
    const nominal  = sanitizeNumber(row[6]);
    const tanggal  = row[1] ? Utilities.formatDate(new Date(row[1]), Session.getScriptTimeZone(), "yyyy-MM-dd") : "";
    const kategori = String(row[3] || "Lainnya");
    const proyek   = String(row[2] || "Lainnya");
    const metode   = String(row[7] || "Lainnya");

    totalNominal += nominal;
    if (tanggal === todayStr) totalHariIni += nominal;

    byKategori[kategori] = (byKategori[kategori] || 0) + nominal;
    byProyek[proyek]     = (byProyek[proyek]     || 0) + nominal;
    byMetode[metode]     = (byMetode[metode]     || 0) + nominal;
  }

  const lastUpdate = Utilities.formatDate(today, Session.getScriptTimeZone(), "dd MMM yyyy, HH:mm");

  dashboard.getRange("A1:H1").merge()
    .setValue("DASHBOARD KEUANGAN")
    .setFontSize(18).setFontWeight("bold")
    .setBackground("#1e293b").setFontColor("#ffffff")
    .setHorizontalAlignment("center");

  dashboard.getRange("A2:H2").merge()
    .setValue("CV Akbar Dharma Karya • Update: " + lastUpdate)
    .setFontSize(10)
    .setBackground("#334155").setFontColor("#94a3b8")
    .setHorizontalAlignment("center");

  dashboard.getRange("A4").setValue("Total Transaksi").setFontWeight("bold");
  dashboard.getRange("B4").setValue(rows.length);

  dashboard.getRange("A5").setValue("Total Pengeluaran").setFontWeight("bold");
  dashboard.getRange("B5").setValue(totalNominal).setNumberFormat("Rp #,##0");

  dashboard.getRange("A6").setValue("Pengeluaran Hari Ini").setFontWeight("bold");
  dashboard.getRange("B6").setValue(totalHariIni).setNumberFormat("Rp #,##0");

  dashboard.getRange("A7").setValue("Rata-rata per Transaksi").setFontWeight("bold");
  dashboard.getRange("B7").setValue(rows.length > 0 ? Math.round(totalNominal / rows.length) : 0)
    .setNumberFormat("Rp #,##0");

  dashboard.getRange("D4").setValue("Per Kategori")
    .setFontWeight("bold").setBackground("#3b82f6").setFontColor("#ffffff");
  let rowIdx = 5;
  for (const [k, v] of Object.entries(byKategori).sort((a, b) => b[1] - a[1])) {
    dashboard.getRange("D" + rowIdx).setValue(k);
    dashboard.getRange("E" + rowIdx).setValue(v).setNumberFormat("#,##0");
    rowIdx++;
  }

  dashboard.getRange("G4").setValue("Per Proyek")
    .setFontWeight("bold").setBackground("#10b981").setFontColor("#ffffff");
  rowIdx = 5;
  for (const [k, v] of Object.entries(byProyek).sort((a, b) => b[1] - a[1])) {
    dashboard.getRange("G" + rowIdx).setValue(k);
    dashboard.getRange("H" + rowIdx).setValue(v).setNumberFormat("#,##0");
    rowIdx++;
  }

  dashboard.setColumnWidth(1, 180);
  dashboard.setColumnWidth(2, 150);
  dashboard.setColumnWidth(4, 150);
  dashboard.setColumnWidth(5, 120);
  dashboard.setColumnWidth(7, 180);
  dashboard.setColumnWidth(8, 120);
}

// ═══════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════

function getOrCreateSheet(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function sanitizeNumber(val) {
  const clean = String(val || "0").replace(/[^0-9.-]/g, "");
  const num   = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

function parseDateInput(val) {
  const raw = String(val || "").trim();
  if (!raw) throw new Error("Tanggal wajib diisi");

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    const [d, m, y] = raw.split("/").map(Number);
    return new Date(y, m - 1, d);
  }

  const parsed = new Date(raw);
  if (isNaN(parsed)) throw new Error("Format tanggal tidak valid");
  return parsed;
}

function formatDateISO(date) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d)) return "";
  return Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd");
}

// Test koneksi Drive — jalankan manual dari GAS editor untuk verifikasi
function testDriveAuth() {
  DriveApp.getFolders();
  Logger.log("DriveApp berhasil diakses");
  const folder = DriveApp.getFolderById(FOLDER_ID);
  Logger.log("Folder ditemukan: " + folder.getName());
}
