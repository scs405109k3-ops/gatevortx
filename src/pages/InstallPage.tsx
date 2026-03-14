import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Smartphone, Wifi, Bell, Share, MoreVertical, Plus, CheckCircle2 } from 'lucide-react';

const InstallPage: React.FC = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Detect iOS
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(ios);

    // Check if already installed
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as any).standalone === true;
    setIsInstalled(standalone);

    // Capture install prompt for Android/Chrome
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstalled(true);
      setDeferredPrompt(null);
    }
  };

  const features = [
    { icon: <Wifi className="h-5 w-5 text-primary" />, title: 'Works Offline', desc: 'Access your data even without internet' },
    { icon: <Bell className="h-5 w-5 text-primary" />, title: 'Push Notifications', desc: 'Get instant alerts for attendance & visitors' },
    { icon: <Smartphone className="h-5 w-5 text-primary" />, title: 'Native App Feel', desc: 'Fullscreen, fast, and no browser clutter' },
    { icon: <Download className="h-5 w-5 text-primary" />, title: 'No App Store Needed', desc: 'Install directly from your browser' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-between px-5 py-10 max-w-[430px] mx-auto">
      {/* Logo + Hero */}
      <div className="flex flex-col items-center gap-4 text-center mt-4">
        <div className="h-20 w-20 rounded-3xl bg-primary flex items-center justify-center shadow-2xl shadow-primary/30">
          <svg className="h-10 w-10 text-primary-foreground" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Install GateVortx</h1>
          <p className="text-sm text-muted-foreground mt-1">Add to your home screen for the best experience</p>
        </div>
      </div>

      {/* Features */}
      <div className="w-full space-y-3 my-8">
        {features.map((f, i) => (
          <div key={i} className="flex items-center gap-4 bg-card border border-border rounded-2xl px-4 py-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              {f.icon}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{f.title}</p>
              <p className="text-xs text-muted-foreground">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Install CTA */}
      <div className="w-full space-y-4">
        {isInstalled || installed ? (
          <div className="flex flex-col items-center gap-3">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <p className="text-base font-bold text-foreground">Already Installed!</p>
            <p className="text-xs text-muted-foreground text-center">GateVortx is on your home screen</p>
            <button
              onClick={() => navigate('/login')}
              className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-bold text-sm active:scale-95 transition-all"
            >
              Open App
            </button>
          </div>
        ) : isIOS ? (
          /* iOS install instructions */
          <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <p className="text-sm font-bold text-foreground text-center">Install on iPhone / iPad</p>
            <div className="space-y-2">
              {[
                { icon: <Share className="h-4 w-4 flex-shrink-0" />, text: 'Tap the Share button in Safari' },
                { icon: <Plus className="h-4 w-4 flex-shrink-0" />, text: 'Tap "Add to Home Screen"' },
                { icon: <CheckCircle2 className="h-4 w-4 flex-shrink-0" />, text: 'Tap "Add" to confirm' },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3 bg-muted rounded-xl px-3 py-2.5">
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    {step.icon}
                  </div>
                  <p className="text-xs text-foreground font-medium">{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        ) : deferredPrompt ? (
          <button
            onClick={handleInstall}
            className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-base flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg shadow-primary/30"
          >
            <Download className="h-5 w-5" />
            Install App
          </button>
        ) : (
          /* Fallback: browser menu instructions */
          <div className="bg-card border border-border rounded-2xl p-4 space-y-2 text-center">
            <p className="text-sm font-bold text-foreground">Install via Browser Menu</p>
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <MoreVertical className="h-4 w-4" />
              <p className="text-xs">Tap the browser menu → "Add to Home Screen" / "Install App"</p>
            </div>
          </div>
        )}

        <button
          onClick={() => navigate('/login')}
          className="w-full h-12 rounded-2xl border border-border text-muted-foreground font-semibold text-sm active:scale-95 transition-all"
        >
          Continue in Browser
        </button>
      </div>
    </div>
  );
};

export default InstallPage;
