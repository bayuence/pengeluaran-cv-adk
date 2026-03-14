# Input Pengeluaran Proyek - PWA

Modern Progressive Web App untuk pencatatan pengeluaran proyek konstruksi. Aplikasi ini dioptimalkan untuk mobile-first experience dengan offline support penuh.

## Fitur Utama

- **Mobile-First Design**: UI yang dioptimalkan untuk smartphone dan tablet
- **Offline Support**: Tetap berfungsi saat offline dengan Service Worker
- **Real-time Validation**: Validasi form yang responsif dan user-friendly
- **Dropdown Dynamic**: Menu dropdown yang diisi dari API Google Apps Script
- **File Upload**: Support upload bukti transaksi dalam format image
- **Draft Recovery**: Menyimpan draft otomatis saat offline
- **Add to Home Screen**: PWA dapat dipasang di home screen Android/iOS
- **Clean & Fast**: Loading <3 detik, Lighthouse PWA score 90+

## Tech Stack

- **Framework**: Next.js 16 (React 19)
- **Styling**: Tailwind CSS 4 + shadcn/ui components
- **State Management**: React Hooks + Custom hooks (useExpense)
- **Service Worker**: Native Web APIs untuk offline support
- **API**: Google Apps Script integrasi

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout dengan PWA metadata
│   ├── page.tsx            # Home page utama
│   └── globals.css         # Global styles dengan design tokens
├── components/
│   ├── ExpenseForm.tsx     # Main form component
│   ├── FormField.tsx       # Reusable form field component
│   ├── FormHeader.tsx      # Header untuk form
│   ├── StatusMessage.tsx   # Status/error message display
│   └── OfflineIndicator.tsx # Offline status indicator
├── lib/
│   ├── api.ts              # API service layer
│   ├── useExpense.ts       # Form state management hook
│   ├── useSW.ts            # Service Worker registration hook
│   └── format.ts           # Utility functions (currency, date)
└── public/
    ├── manifest.json       # PWA manifest
    ├── sw.js              # Service Worker
    └── icons/             # App icons (192x192, 512x512, dll)
```

## Form Fields

| Field | Type | Required | Catatan |
|-------|------|----------|---------|
| Tanggal | Date | Ya | Format: YYYY-MM-DD |
| Proyek | Select | Ya | Dari API: `proyek` |
| Kategori | Select | Ya | Dari API: `Kategori` |
| Nominal | Number | Ya | Angka positif dalam Rupiah |
| Metode Pembayaran | Select | Ya | Dari API: `Metode` |
| PIC | Select | Ya | Dari API: `PIC` |
| Deskripsi | Text | Ya | Min 5 karakter |
| Catatan | Textarea | Tidak | Optional notes |
| User | Text | Ya | Nama yang input data |
| Upload Bukti | File | Tidak | Gambar untuk dokumentasi |

## Google Apps Script API Integration

Aplikasi menggunakan Google Apps Script API dengan endpoint:
```
https://script.google.com/macros/s/AKfycbwrXkD-sDklkFvqTe2cjKbMNI2-gdrzz0ci1P1lNpEr6-ED7xojkMaKwQ4Z2s8nFETH/exec
```

### API Endpoints

#### 1. Get Dropdown Options
```
GET /?action=getOptions&tipe=proyek
GET /?action=getOptions&tipe=Kategori
GET /?action=getOptions&tipe=Metode
GET /?action=getOptions&tipe=PIC
```

Response:
```json
["Option 1", "Option 2", "Option 3"]
```

#### 2. Submit Expense Data
```
POST /?action=submit
Content-Type: application/json

{
  "tanggal": "2026-03-14",
  "proyek": "Proyek A",
  "kategori": "Material",
  "nominal": "100000",
  "metode": "Transfer",
  "pic": "John Doe",
  "deskripsi": "Pembelian material konstruksi",
  "catatan": "Terkirim lengkap",
  "user_input": "Admin",
  "bukti": "base64-image-string",
  "timestamp": "2026-03-14T10:30:00Z"
}
```

Response:
```json
{
  "id": "expense-123456",
  "timestamp": "2026-03-14T10:30:00Z"
}
```

## Instalasi & Setup

### 1. Clone Repository
```bash
git clone <repo-url>
cd project
```

### 2. Install Dependencies
```bash
npm install
# atau
pnpm install
```

### 3. Development Server
```bash
npm run dev
```
Buka `http://localhost:3000` di browser.

### 4. Build untuk Production
```bash
npm run build
npm start
```

## PWA Features

### Manifest.json
Konfigurasi PWA di `public/manifest.json`:
- `display: "standalone"` - Full-screen app mode
- `orientation: "portrait-primary"` - Portrait mode untuk mobile
- `theme_color` - Color bar di Android
- Icons untuk berbagai ukuran: 192x192, 512x512 (maskable)

### Service Worker
- **Cache Strategy**: Network-first untuk HTML, Cache-first untuk assets
- **Offline Support**: Automatic draft saving saat offline
- **Update Detection**: Periodic update checks setiap 1 menit

### Add to Home Screen
- **Android**: Chrome → Menu → "Install app" / "Add to Home Screen"
- **iOS**: Safari → Share → "Add to Home Screen"

## Validation Rules

Semua field memiliki validasi real-time:

```typescript
- tanggal: Required, format date
- proyek: Required, selected from dropdown
- kategori: Required, selected from dropdown
- nominal: Required, positive number
- metode: Required, selected from dropdown
- pic: Required, selected from dropdown
- deskripsi: Required, min 5 characters
- user_input: Required
- catatan: Optional
- bukti: Optional
```

## Error Handling

### Network Errors
- Automatic retry logic (max 3 attempts, 1s delay)
- Graceful fallback ke saved data saat API down
- Draft auto-save untuk offline scenarios

### Form Errors
- Real-time field validation
- Clear error messages dalam Bahasa Indonesia
- Error highlighting dengan color coding

### File Upload
- Support image files only
- Automatic compression sebelum upload
- Fallback jika file upload gagal

## Offline Workflow

1. **Online**: Form submit → API → Success/Error
2. **Offline**: Form submit → Draft Save → Success Message
3. **Back Online**: 
   - OfflineIndicator menampilkan notifikasi
   - User dapat melihat jumlah draft
   - User dapat retry atau clear drafts

## Performance Metrics

Target performance metrics:
- **First Contentful Paint (FCP)**: < 1.5s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **Cumulative Layout Shift (CLS)**: < 0.1
- **Time to Interactive (TTI)**: < 3.5s
- **Lighthouse PWA Score**: 90+

## Browser Support

- Chrome/Edge: 88+
- Firefox: 85+
- Safari: 14+
- Samsung Internet: 14+

## Security

- HTTPS only (untuk PWA)
- No sensitive data di localStorage (hanya drafts)
- Base64 image upload untuk file handling
- Input validation & sanitization
- CORS headers configuration

## Development Tips

### Debug Service Worker
```javascript
// Di browser console
navigator.serviceWorker.getRegistrations()
  .then(registrations => console.log(registrations))
```

### Clear All Caches
```javascript
caches.keys().then(names => {
  names.forEach(name => caches.delete(name))
})
```

### Clear Drafts
```javascript
localStorage.removeItem('expense_drafts')
```

## Troubleshooting

### PWA tidak install
- Pastikan HTTPS (untuk production)
- Check manifest.json di DevTools
- Verify Service Worker registration

### Form tidak submit
- Check API endpoint di `lib/api.ts`
- Verify Google Apps Script endpoint
- Check network tab di DevTools

### Offline tidak jalan
- Check Service Worker status
- Verify cache manifest
- Check browser quota limits

## Environment Variables

```env
# Optional - API endpoint dapat dikustomisasi
NEXT_PUBLIC_API_ENDPOINT=https://script.google.com/macros/s/.../exec
```

## Deployment

### Vercel (Recommended)
```bash
vercel deploy
```

### Other Platforms
- Ensure HTTPS enabled
- Set correct environment variables
- Configure CORS headers jika perlu

## License

MIT License

## Support

Untuk masalah atau saran, silakan buat issue di repository.

---

**Built with ❤️ for modern web applications**
