import React from 'react';
import { Bell, CheckCheck, X, CalendarCheck, FileText, Info } from 'lucide-react';
import type { AppNotification } from '../types/app';

interface Props {
  open: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  unreadCount: number;
  onMarkAllRead: () => void;
}

const typeIcon = (type: string) => {
  if (type === 'attendance') return <CalendarCheck className="h-4 w-4 text-primary" />;
  if (type === 'leave') return <FileText className="h-4 w-4 text-amber-500" />;
  return <Info className="h-4 w-4 text-muted-foreground" />;
};

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

const NotificationsDrawer: React.FC<Props> = ({ open, onClose, notifications, unreadCount, onMarkAllRead }) => {
  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm z-50 bg-background rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out ${open ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ maxHeight: '82vh' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-foreground" />
            <h2 className="font-bold text-foreground text-base">Notifications</h2>
            {unreadCount > 0 && (
              <span className="h-5 min-w-[20px] bg-destructive text-destructive-foreground rounded-full text-[11px] font-bold flex items-center justify-center px-1">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                className="flex items-center gap-1 text-xs font-medium text-primary active:opacity-70"
              >
                <CheckCheck className="h-4 w-4" />
                Mark all read
              </button>
            )}
            <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-full bg-muted">
              <X className="h-4 w-4 text-foreground" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(82vh - 100px)' }}>
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <Bell className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm font-semibold text-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground mt-1">Your attendance and leave updates will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map(n => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-5 py-4 transition-colors ${!n.read ? 'bg-primary/5' : ''}`}
                >
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 ${!n.read ? 'bg-primary/10' : 'bg-muted'}`}>
                    {typeIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${!n.read ? 'font-semibold text-foreground' : 'text-foreground'}`}>
                      {n.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.read && (
                    <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default NotificationsDrawer;
