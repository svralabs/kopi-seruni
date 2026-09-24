'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Download, X, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Jangan tampilkan jika sudah dalam mode standalone (aplikasi terinstal)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      return;
    }

    // Cek apakah user sudah pernah menutup banner
    const isDismissed = localStorage.getItem('seruni_pwa_dismissed') === 'true';
    if (isDismissed) {
      return;
    }

    // Deteksi perangkat iOS Safari
    const ua = window.navigator.userAgent;
    const isIosDevice = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;

    if (isIosDevice) {
      setIsIOS(true);
      setIsVisible(true);
      return;
    }

    // Tangani event beforeinstallprompt untuk Android / Chromium
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    const handleAppInstalled = () => {
      setIsVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('seruni_pwa_dismissed', 'true');
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-label="Instal Aplikasi Kopi Seruni POS"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 bg-white border border-[#E6E0D8] rounded-xl p-4 shadow-xl text-[#201C1A] animate-in fade-in slide-in-from-bottom-4 duration-200"
    >
      <div className="flex items-start gap-3">
        <Image
          src="/icon-192.png"
          alt="Logo Kopi Seruni"
          width={44}
          height={44}
          className="rounded-lg shadow-xs shrink-0 object-cover"
        />

        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#201C1A] truncate">
              Kopi Seruni POS
            </h3>
            <button
              onClick={handleDismiss}
              className="text-neutral-400 hover:text-neutral-700 p-1 rounded-md transition-colors"
              aria-label="Tutup pemberitahuan instalasi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-neutral-600 mt-0.5 leading-relaxed">
            Pasang aplikasi di layar utama untuk akses kasir lebih cepat dan stabil.
          </p>

          <div className="mt-3">
            {isIOS ? (
              <div className="flex items-center gap-1.5 text-xs text-[#54382B] bg-[#F7F5F0] p-2 rounded-lg font-medium">
                <Share className="w-3.5 h-3.5 shrink-0" />
                <span>Tap tombol Bagikan lalu pilih Tambahkan ke Layar Utama.</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleInstallClick}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 bg-[#201C1A] hover:bg-[#38302C] text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Instal Aplikasi</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
