import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const OfflineBanner: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="bg-rose-600 text-white px-4 py-2 text-xs sm:text-sm font-medium flex items-center justify-center gap-2 shadow-md sticky top-0 z-50">
      <WifiOff className="w-4 h-4 animate-pulse" />
      <span>Internet connection required to mark attendance. You are currently offline.</span>
    </div>
  );
};
