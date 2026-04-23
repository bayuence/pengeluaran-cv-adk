'use client';

/**
 * MultiBuktiUploader Component
 * Upload beberapa foto bukti sekaligus, preview inline, hapus per foto
 * Max 5 foto, masing-masing dikompres sebelum dikirim
 */

import { useRef, useState } from 'react';
import { ImagePlus, X, ZoomIn } from 'lucide-react';
import Image from 'next/image';

interface Props {
  files: File[];
  previews: string[]; // base64 preview URL per file
  onAdd: (newFiles: File[]) => void;
  onRemove: (index: number) => void;
  error?: string;
  maxFiles?: number;
}

export function MultiBuktiUploader({
  files,
  previews,
  onAdd,
  onRemove,
  error,
  maxFiles = 5,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;

    const remaining = maxFiles - files.length;
    const toAdd = selected.slice(0, remaining);
    onAdd(toAdd);

    // Reset input agar file yang sama bisa dipilih lagi
    e.target.value = '';
  };

  const canAddMore = files.length < maxFiles;

  return (
    <div className="space-y-3">
      {/* Label */}
      <div className="text-sm font-medium text-foreground">
        Upload Bukti Foto
        <span className="ml-1 text-xs text-muted-foreground font-normal">
          (opsional, maks. {maxFiles} foto)
        </span>
      </div>

      {/* Grid preview + tombol tambah */}
      <div className="flex flex-wrap gap-2">
        {/* Thumbnails yang sudah dipilih */}
        {previews.map((src, idx) => (
          <div
            key={idx}
            className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-primary/30 bg-muted group shadow-sm"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={`Bukti ${idx + 1}`}
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => setLightbox(src)}
            />

            {/* Overlay: zoom icon on hover */}
            <div
              className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
              onClick={() => setLightbox(src)}
            >
              <ZoomIn className="h-5 w-5 text-white" />
            </div>

            {/* Tombol hapus */}
            <button
              type="button"
              onClick={() => onRemove(idx)}
              className="absolute top-0.5 right-0.5 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 transition-colors z-10 shadow"
              aria-label={`Hapus foto ${idx + 1}`}
            >
              <X className="h-3 w-3" />
            </button>

            {/* Badge nomor */}
            <span className="absolute bottom-0.5 left-0.5 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-full leading-none">
              {idx + 1}
            </span>
          </div>
        ))}

        {/* Tombol tambah foto */}
        {canAddMore && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-20 h-20 rounded-xl border-2 border-dashed border-border hover:border-primary/50 bg-muted hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary"
          >
            <ImagePlus className="h-6 w-6" />
            <span className="text-[10px] font-medium">
              {files.length === 0 ? 'Tambah Foto' : 'Foto Lagi'}
            </span>
          </button>
        )}
      </div>

      {/* Info jumlah */}
      {files.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {files.length} foto dipilih
          {files.length < maxFiles && ` · bisa tambah ${maxFiles - files.length} lagi`}
        </p>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-destructive font-medium">{error}</p>
      )}

      {/* Hidden input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleInputChange}
      />

      {/* Lightbox / preview besar */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white p-2 hover:bg-white/20 rounded-full"
          >
            <X className="h-6 w-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="Preview"
            className="max-w-full max-h-[85vh] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <p className="text-white/60 text-xs mt-3">Ketuk di luar untuk menutup</p>
        </div>
      )}
    </div>
  );
}
