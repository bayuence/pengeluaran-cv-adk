'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchHistory, HistoryItem } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Image as ImageIcon, X, ChevronDown } from 'lucide-react';

export default function HistoryPage() {
  const [transactions, setTransactions] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
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

  // Open image in new tab
  const openImageInNewTab = (url: string) => {
    window.open(url, '_blank');
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

                {/* Bukti/Proof Image */}
                {isValidImageUrl(item.bukti) && (
                  <button
                    onClick={() => setSelectedImage(getPreviewUrl(item.bukti))}
                    className="flex items-center gap-2 text-xs text-primary hover:underline"
                  >
                    <ImageIcon className="h-4 w-4" />
                    Lihat Bukti
                  </button>
                )}

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

      {/* Image Modal - using iframe for Google Drive */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 text-white p-2 hover:bg-white/20 rounded-full z-10"
          >
            <X className="h-6 w-6" />
          </button>
          <iframe
            src={selectedImage}
            className="w-full max-w-3xl h-[80vh] rounded-lg bg-white"
            onClick={(e) => e.stopPropagation()}
            allow="autoplay"
          />
          <a
            href={selectedImage.replace('/preview', '/view')}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 text-white text-sm hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            Buka di Google Drive →
          </a>
        </div>
      )}
    </main>
  );
}
