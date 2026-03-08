import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Inbox, Send, Star, FileText, Trash2, Tag, PenSquare, X,
  Menu, LogOut, ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useMailLabels } from '../../hooks/useMailLabels';
import { useMailStats } from '../../hooks/useMailStats';
import ComposeModal from '../../components/mail/ComposeModal';

const MailLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, signOut, user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) navigate('/login', { replace: true });
  }, [user, loading, navigate]);
  const { labels } = useMailLabels();
  const { unreadInbox } = useMailStats();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);

  const navItems = [
    { label: 'Inbox', path: '/mail/inbox', icon: Inbox, badge: unreadInbox },
    { label: 'Sent', path: '/mail/sent', icon: Send, badge: 0 },
    { label: 'Starred', path: '/mail/starred', icon: Star, badge: 0 },
    { label: 'Drafts', path: '/mail/drafts', icon: FileText, badge: 0 },
    { label: 'Trash', path: '/mail/trash', icon: Trash2, badge: 0 },
  ];

  const isActive = (path: string) => location.pathname === path;

  const Sidebar = () => (
    <div className="flex flex-col h-full bg-[hsl(220,26%,10%)] text-white">
      {/* Brand */}
      <div className="px-5 pt-6 pb-4 border-b border-white/10">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Send className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight">MailVortx</span>
        </div>
        <p className="text-xs text-white/40 truncate">{profile?.email}</p>
      </div>

      {/* Compose Button */}
      <div className="px-4 py-4">
        <button
          onClick={() => { setComposeOpen(true); setSidebarOpen(false); }}
          className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2.5 rounded-xl text-sm transition-all active:scale-95 shadow-lg shadow-primary/30"
        >
          <PenSquare className="h-4 w-4" />
          Compose
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => { navigate(item.path); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge > 0 && (
                <span className="h-5 min-w-[20px] bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Labels */}
        {labels.length > 0 && (
          <div className="pt-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 px-3 mb-2">Labels</p>
            {labels.map(label => (
              <button
                key={label.id}
                onClick={() => { navigate(`/mail/label/${label.id}`); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  location.pathname === `/mail/label/${label.id}`
                    ? 'bg-primary text-primary-foreground'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span
                  className="h-3 w-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: label.color }}
                />
                <span className="flex-1 text-left truncate">{label.name}</span>
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-white/10">
        <button
          onClick={() => navigate('/mail/labels')}
          className="w-full flex items-center gap-2 text-white/50 hover:text-white text-xs font-medium py-2 px-3 rounded-xl hover:bg-white/10 transition-all mb-1"
        >
          <Tag className="h-3.5 w-3.5" />
          Manage Labels
        </button>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-2 text-white/50 hover:text-white text-xs font-medium py-2 px-3 rounded-xl hover:bg-white/10 transition-all"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-56 flex-shrink-0 flex-col">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64">
            <div className="relative h-full">
              <button
                onClick={() => setSidebarOpen(false)}
                className="absolute top-4 right-4 z-10 text-white/60 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
              <Sidebar />
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Top Bar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-card border-b border-border">
          <button onClick={() => setSidebarOpen(true)} className="text-foreground">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <Send className="h-4 w-4 text-primary" />
            <span className="font-bold text-foreground">MailVortx</span>
          </div>
          <button
            onClick={() => setComposeOpen(true)}
            className="p-2 bg-primary rounded-lg text-primary-foreground"
          >
            <PenSquare className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-hidden">
          <Outlet context={{ setComposeOpen }} />
        </div>
      </div>

      {composeOpen && <ComposeModal onClose={() => setComposeOpen(false)} />}
    </div>
  );
};

export default MailLayout;
