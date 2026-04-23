'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchHistory, HistoryItem } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Image as ImageIcon, Images, X, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

export default function HistoryPage() {
  const [transactions, setTransactions] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Modal: array URL foto + index aktif
  const [modalImages, setModalImages] = useState<string[]>([]);
  const [modalIndex, setModalIndex] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const LIMIT = 20;

  const loadTransactions = async (loadMore = false) => {
    if (loadMore) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    const currentOffset = loadMore ? offset : 0;
    const result = await fetchHistory(LIMIT, currentOffset);

    if (result.success && result.data) {
      if (loadMore) {
        setTransactions(prev => [...prev, ...result.data!]);
      } else {
        setTransactions(result.data);
      }
      setHasMore(result.data.length === LIMIT);
      setOffset(currentOffset + result.data.length);
    } else {
      setError(result.error || 'Gagal memuat data');
    }

    setIsLoading(false);
    setIsLoadingMore(false);
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const isValidImageUrl = (url: string) => {
    return url && url.startsWith('http') && !url.includes('Upload') && !url.includes('Gagal');
  };

  /**
   * Parse field bukti: bisa single URL atau multi URL dipisahkan '||'
   * Kembalikan array URL yang valid saja
   */
  const parseBuktiUrls = (bukti: string): string[] => {
    if (!bukti) return [];
    // Support format baru (\n) dan format lama (||) sekaligus
    const separator = bukti.includes('||') ? '||' : '\n';
    return bukti
      .split(separator)
      .map((u) => u.trim())
      .filter(isValidImageUrl);
  };

  // Convert Google Drive URL to embeddable preview URL
  const getPreviewUrl = (url: string) => {
    if (!url) return '';
    // Format: https://drive.google.com/file/d/FILE_ID/view
    // Convert to: https://drive.google.com/file/d/FILE_ID/preview (for iframe)
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match) {
      return `https://drive.google.com/file/d/${match[1]}/preview`;
    }
    return url;
  };

  // Buka modal dengan daftar foto + mulai dari index tertentu
  const openModal = (urls: string[], startIndex = 0) => {
    setModalImages(urls.map(getPreviewUrl));
    setModalIndex(startIndex);
  };

  const closeModal = () => setModalImages([]);

  const prevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setModalIndex((i) => (i > 0 ? i - 1 : modalImages.length - 1));
  };

  const nextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setModalIndex((i) => (i < modalImages.length - 1 ? i + 1 : 0));
  };

  return (
    <main className="min-h-screen w-full bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" className="shrink-0">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold">Riwayat Transaksi</h1>
              <p className="text-xs text-muted-foreground">
                {transactions.length} transaksi dimuat
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Memuat riwayat...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <p className="text-sm text-destructive">{error}</p>
            <Button onClick={() => loadTransactions()} variant="outline" size="sm">
              Coba Lagi
            </Button>
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <p className="text-sm text-muted-foreground">Belum ada transaksi</p>
            <Link href="/">
              <Button size="sm">Input Transaksi</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((item) => (
              <div
                key={item.id}
                className="bg-card border rounded-xl p-4 space-y-3"
              >
                {/* Header: Date & Amount */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{formatDate(item.tanggal)}</p>
                    <p className="font-semibold text-lg">{formatCurrency(item.nominal)}</p>
                  </div>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                    {item.metode}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-1">
                  <p className="text-sm font-medium">{item.deskripsi}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="bg-muted px-2 py-0.5 rounded">{item.proyek}</span>
                    <span className="bg-muted px-2 py-0.5 rounded">{item.kategori}</span>
                    <span>PIC: {item.pic}</span>
                  </div>
                  {item.catatan && (
                    <p className="text-xs text-muted-foreground italic mt-1">
                      &quot;{item.catatan}&quot;
                    </p>
                  )}
                </div>

                {/* Bukti/Proof Image — support multiple */}
                {(() => {
                  const buktiUrls = parseBuktiUrls(item.bukti);
                  if (buktiUrls.length === 0) return null;

                  if (buktiUrls.length === 1) {
                    // Single photo → tampil seperti sebelumnya
                    return (
                      <button
                        onClick={() => openModal(buktiUrls, 0)}
                        className="flex items-center gap-2 text-xs text-primary hover:underline"
                      >
                        <ImageIcon className="h-4 w-4" />
                        Lihat Bukti
                      </button>
                    );
                  }

                  // Multiple photos → thumbnail strip
                  return (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
                        <Images className="h-4 w-4" />
                        {buktiUrls.length} Foto Bukti
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {buktiUrls.map((url, photoIdx) => (
                          <button
                            key={photoIdx}
                            onClick={() => openModal(buktiUrls, photoIdx)}
                            className="relative w-14 h-14 rounded-lg overflow-hidden border border-primary/30 bg-muted hover:ring-2 hover:ring-primary/50 transition-all"
                            title={`Foto ${photoIdx + 1}`}
                          >
                            {/* Placeholder karena kita tidak bisa embed iframe di thumbnail */}
                            <div className="w-full h-full flex items-center justify-center bg-primary/5">
                              <ImageIcon className="h-5 w-5 text-primary/50" />
                            </div>
                            <span className="absolute bottom-0 right-0 bg-primary text-white text-[9px] px-1 py-0.5 rounded-tl-md leading-none">
                              {photoIdx + 1}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
                  <span>ID: {item.id}</span>
                  <span>oleh {item.user || 'Sistem'}</span>
                </div>
              </div>
            ))}

            {/* Load More */}
            {hasMore && (
              <div className="py-4 flex justify-center">
                <Button
                  onClick={() => loadTransactions(true)}
                  disabled={isLoadingMore}
                  variant="outline"
                  className="w-full max-w-xs"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Memuat...
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-2" />
                      Muat Lebih Banyak
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Image Modal - using iframe for Google Drive, support navigasi multi-foto */}
      {modalImages.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4"
          onClick={closeModal}
        >
          {/* Close button */}
          <button
            onClick={closeModal}
            className="absolute top-4 right-4 text-white p-2 hover:bg-white/20 rounded-full z-10"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Counter */}
          {modalImages.length > 1 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/40 px-3 py-1 rounded-full">
              {modalIndex + 1} / {modalImages.length}
            </div>
          )}

          {/* Iframe viewer */}
          <iframe
            src={modalImages[modalIndex]}
            className="w-full max-w-3xl h-[75vh] rounded-lg bg-white"
            onClick={(e) => e.stopPropagation()}
            allow="autoplay"
          />

          {/* Navigation arrows (jika lebih dari 1 foto) */}
          {modalImages.length > 1 && (
            <>
              <button
                onClick={prevPhoto}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-white p-2 bg-black/50 hover:bg-black/70 rounded-full"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={nextPhoto}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white p-2 bg-black/50 hover:bg-black/70 rounded-full"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          {/* Link buka di Drive */}
          <div className="mt-3 flex items-center gap-4">
            <a
              href={modalImages[modalIndex].replace('/preview', '/view')}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white text-sm hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              Buka di Google Drive →
            </a>
          </div>
        </div>
      )}
    </main>
  );
}
