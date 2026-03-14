/**
 * Service Worker Registration Hook
 * Handles SW registration and updates
 */

import { useEffect, useState } from 'react';

export interface SWStatus {
  installed: boolean;
  updateAvailable: boolean;
  registration: ServiceWorkerRegistration | null;
  error: string | null;
}

export function useSW() {
  const [status, setStatus] = useState<SWStatus>({
    installed: false,
    updateAvailable: false,
    registration: null,
    error: null,
  });

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      console.log('[useSW] Service Workers tidak didukung oleh browser ini');
      return;
    }

    let updateCheckInterval: ReturnType<typeof setInterval> | null = null;

    async function register() {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        console.log('[useSW] Service Worker terdaftar:', registration.scope);

        setStatus((prev) => ({
          ...prev,
          installed: true,
          registration,
          error: null,
        }));

        // Cek update setiap 1 menit
        updateCheckInterval = setInterval(() => {
          registration.update().catch((err) => {
            console.warn('[useSW] Gagal cek update SW (non-kritis):', err);
          });
        }, 60000);

        // Dengarkan event update
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'activated') {
                console.log('[useSW] Service Worker baru diaktifkan');
                setStatus((prev) => ({
                  ...prev,
                  updateAvailable: true,
                }));
              }
            });
          }
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Registrasi Service Worker gagal';
        console.warn('[useSW] Registrasi SW gagal (fitur opsional):', errorMessage);

        setStatus((prev) => ({
          ...prev,
          installed: false,
          error: errorMessage,
        }));
      }
    }

    register();

    // Cleanup: hapus interval saat komponen unmount
    return () => {
      if (updateCheckInterval !== null) {
        clearInterval(updateCheckInterval);
      }
    };
  }, []);

  const updateSW = async () => {
    if (status.registration) {
      await status.registration.unregister();
      window.location.reload();
    }
  };

  return { ...status, updateSW };
}
