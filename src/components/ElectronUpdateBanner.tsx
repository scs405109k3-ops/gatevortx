import { useEffect, useState } from 'react';
import { Download, RefreshCw, X, CheckCircle } from 'lucide-react';

interface UpdateState {
  status: 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'up-to-date' | 'error';
  version?: string;
  percent?: number;
  message?: string;
}

/**
 * Shows a soft update notification banner at the top of the app when
 * running inside the Electron desktop wrapper.
 * Only renders if window.electronAPI is present (i.e., running in Electron).
 */
export default function ElectronUpdateBanner() {
  const [update, setUpdate] = useState<UpdateState>({ status: 'idle' });
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Only run inside Electron
    const api = (window as any).electronAPI;
    if (!api?.onUpdateStatus) return;

    const cleanup = api.onUpdateStatus((data: UpdateState) => {
      setUpdate(data);
      setDismissed(false); // Show banner again for new update events
    });

    return () => {
      if (typeof cleanup === 'function') cleanup();
    };
  }, []);

  // Don't render outside Electron or when dismissed/idle
  const api = (window as any).electronAPI;
  if (!api?.isElectron) return null;
  if (dismissed) return null;
  if (update.status === 'idle' || update.status === 'checking' || update.status === 'up-to-date') return null;

  const bannerConfig = {
    available: {
      bg: 'bg-primary',
      icon: <Download className="h-4 w-4 flex-shrink-0" />,
      text: `v${update.version} is available — downloading in background…`,
      action: null,
    },
    downloading: {
      bg: 'bg-primary',
      icon: <Download className="h-4 w-4 flex-shrink-0 animate-bounce" />,
      text: `Downloading update… ${update.percent ?? 0}%`,
      action: null,
    },
    downloaded: {
      bg: 'bg-success',
      icon: <CheckCircle className="h-4 w-4 flex-shrink-0" />,
      text: `v${update.version} ready! Restart to apply.`,
      action: (
        <button
          onClick={() => api.installUpdate()}
          className="ml-3 px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Restart Now
        </button>
      ),
    },
    error: {
      bg: 'bg-destructive',
      icon: <X className="h-4 w-4 flex-shrink-0" />,
      text: `Update failed: ${update.message ?? 'unknown error'}`,
      action: null,
    },
  } as const;

  const config = bannerConfig[update.status as keyof typeof bannerConfig];
  if (!config) return null;

  return (
    <div className={`fixed top-0 left-0 right-0 z-[9999] ${config.bg} text-white px-4 py-2.5 flex items-center justify-between shadow-lg`}>
      <div className="flex items-center gap-2 text-sm font-medium">
        {config.icon}
        <span>{config.text}</span>
        {update.status === 'downloading' && (
          <div className="ml-2 w-24 h-1.5 rounded-full bg-white/30 overflow-hidden">
            <div
              className="h-full rounded-full bg-white transition-all duration-300"
              style={{ width: `${update.percent ?? 0}%` }}
            />
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {config.action}
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded-full hover:bg-white/20 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
