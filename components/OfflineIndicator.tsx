'use client';

/**
 * Offline Indicator Component
 * Shows when app is working offline and provides draft recovery options
 */

import { useState, useEffect } from 'react';
import { AlertCircle, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getDraftLocally, clearDraftsLocally } from '@/lib/api';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [draftCount, setDraftCount] = useState(0);
  const [showDraftInfo, setShowDraftInfo] = useState(false);

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine);
    setDraftCount(getDraftLocally().length);

    const handleOnline = () => {
      setIsOnline(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleClearDrafts = () => {
    clearDraftsLocally();
    setDraftCount(0);
    setShowDraftInfo(false);
  };

  // Refresh draft count setiap kali kembali online
  useEffect(() => {
    if (isOnline) {
      setDraftCount(getDraftLocally().length);
    }
  }, [isOnline]);

  if (isOnline && draftCount === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 right-4 z-40 flex flex-col gap-2">
      {/* Offline Status */}
      {!isOnline && (
        <div className="flex items-center gap-3 bg-yellow-50 dark:bg-yellow-950 text-yellow-900 dark:text-yellow-100 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800 shadow-sm">
          <WifiOff className="h-5 w-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">Anda sedang offline</p>
            <p className="text-xs opacity-90">Data akan disimpan sebagai draft</p>
          </div>
        </div>
      )}

      {/* Draft Recovery */}
      {isOnline && draftCount > 0 && (
        <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-950 text-blue-900 dark:text-blue-100 p-3 rounded-lg border border-blue-200 dark:border-blue-800 shadow-sm">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <div className="flex-1">
            <button
              onClick={() => setShowDraftInfo(!showDraftInfo)}
              className="text-sm font-medium hover:underline text-left"
            >
              Ada {draftCount} draft yang belum terkirim
            </button>
          </div>
          {showDraftInfo && (
            <Button
              onClick={handleClearDrafts}
              variant="outline"
              size="sm"
              className="ml-2 text-xs flex-shrink-0"
            >
              Hapus Draft
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
