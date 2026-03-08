import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOfflineStatus } from '../hooks/useOfflineStatus';

const OfflineBanner: React.FC = () => {
  const isOffline = useOfflineStatus();

  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-semibold shadow-lg animate-fade-in safe-top">
      <WifiOff className="h-4 w-4 flex-shrink-0" />
      <span>You're offline — showing cached data</span>
    </div>
  );
};

export default OfflineBanner;
