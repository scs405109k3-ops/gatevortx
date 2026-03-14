import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DISMISSED_KEY = 'gatevortx-pwa-banner-dismissed';

const PWAInstallBanner: React.FC = () => {
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed) return;

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as any).standalone === true;
    if (isStandalone) return;

    // Show banner after 3 seconds for iOS (no beforeinstallprompt)
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIOS) {
      const timer = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(timer);
    }

    // Show banner when install prompt is available (Android/Chrome)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        dismiss();
        return;
      }
    }
    navigate('/install');
  };

  const dismiss = () => {
    setShow(false);
    localStorage.setItem(DISMISSED_KEY, '1');
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[390px] z-40 md:hidden">
      <div className="bg-card border border-border rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
          <svg className="h-5 w-5 text-primary-foreground" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">Install GateVortx</p>
          <p className="text-[11px] text-muted-foreground">Add to home screen for quick access</p>
        </div>
        <button
          onClick={handleInstall}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-bold px-3 py-2 rounded-xl active:scale-95 transition-all flex-shrink-0"
        >
          <Download className="h-3.5 w-3.5" />
          Install
        </button>
        <button onClick={dismiss} className="text-muted-foreground p-1 flex-shrink-0">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default PWAInstallBanner;
