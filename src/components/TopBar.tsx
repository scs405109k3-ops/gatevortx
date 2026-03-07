import React from 'react';
import { Bell, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../hooks/useNotifications';

interface TopBarProps {
  title: string;
  subtitle?: string;
}

const TopBar: React.FC<TopBarProps> = ({ title, subtitle }) => {
  const { profile, signOut } = useAuth();
  const { unreadCount, markAllRead } = useNotifications();

  return (
    <div
      className="px-5 pt-12 pb-4 text-white"
      style={{ background: 'linear-gradient(135deg, hsl(213,57%,25%) 0%, hsl(217,91%,43%) 100%)' }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-blue-200 text-xs font-medium uppercase tracking-wider">{subtitle || profile?.role?.toUpperCase()}</p>
          <h1 className="text-xl font-bold">{title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={markAllRead}
            className="relative p-2 bg-white/10 rounded-xl"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={signOut}
            className="p-2 bg-white/10 rounded-xl"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
      {profile && (
        <div className="mt-3 flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-semibold">
            {profile.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div>
            <p className="text-sm font-medium">{profile.name}</p>
            <p className="text-blue-200 text-xs">{profile.email}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TopBar;
