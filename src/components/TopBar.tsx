import React from 'react';
import { Bell, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import logo from '../assets/logo.png';

interface TopBarProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

const TopBar: React.FC<TopBarProps> = ({ title, subtitle, action }) => {
  const { profile, signOut } = useAuth();
  const { unreadCount, markAllRead } = useNotifications();

  return (
    <div
      className="px-5 pt-12 pb-4 text-white"
      style={{ background: 'var(--gradient-brand)' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src={logo} alt="GateVortx" className="h-9 w-9 object-contain rounded-lg" />
          <div>
            <p className="text-blue-200 text-xs font-medium uppercase tracking-wider">{subtitle || profile?.role?.toUpperCase()}</p>
            <h1 className="text-xl font-bold leading-tight">{title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {action && action}
          <button
            onClick={markAllRead}
            className="relative p-2 bg-white/15 rounded-xl backdrop-blur-sm"
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
            className="p-2 bg-white/15 rounded-xl backdrop-blur-sm"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
      {profile && (
        <div className="mt-3 flex items-center gap-2">
          <div
            className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg, hsl(var(--purple)) 0%, hsl(var(--cyan)) 100%)' }}
          >
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
