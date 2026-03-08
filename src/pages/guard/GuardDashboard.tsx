import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, UserPlus, ClipboardList, Users, Home, UserCheck, Mail, LogOut, User } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import type { Visitor } from '../../types/app';
import { useAuth } from '../../context/AuthContext';
import BottomNav from '../../components/BottomNav';
import StatusBadge from '../../components/StatusBadge';
import { useNotifications } from '../../hooks/useNotifications';

const NAV_ITEMS = [
  { label: 'Home', path: '/guard', icon: <Home className="h-5 w-5" /> },
  { label: 'Attendance', path: '/guard/attendance', icon: <UserCheck className="h-5 w-5" /> },
  { label: 'Visitors', path: '/guard/visitors', icon: <ClipboardList className="h-5 w-5" /> },
  { label: 'Add', path: '/guard/add-visitor', icon: <Users className="h-5 w-5" /> },
  { label: 'Profile', path: '/guard/profile', icon: <User className="h-5 w-5" /> },
];

const GuardDashboard: React.FC = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const { unreadCount } = useNotifications();
  const today = new Date().toISOString().split('T')[0];

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  useEffect(() => {
    if (!profile) return;
    const fetchVisitors = async () => {
      const { data } = await supabase
        .from('visitors')
        .select('*')
        .eq('guard_id', profile.id)
        .eq('date', today)
        .order('created_at', { ascending: false });
      setVisitors((data as Visitor[]) || []);
      setLoading(false);
    };
    fetchVisitors();

    const channel = supabase
      .channel('guard-visitors')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visitors', filter: `guard_id=eq.${profile.id}` },
        () => fetchVisitors())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile, today]);

  const firstName = profile?.name?.split(' ')[0] || 'Officer';

  return (
    <div className="mobile-container bg-background flex flex-col pb-24 md:pb-8">
      {/* Header */}
      <header className="flex items-center bg-card px-4 py-3.5 sticky top-0 z-10 border-b border-border justify-between">
        <div className="flex items-center gap-2.5">
          <div className="bg-primary/10 p-1.5 rounded-lg">
            <svg className="h-5 w-5 text-primary" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
            </svg>
          </div>
          <span className="text-lg font-bold text-foreground">GateVortx</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/guard/notifications')}
            className="relative flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted transition-colors"
          >
            <Bell className="h-5 w-5 text-foreground" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
            )}
          </button>
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-primary font-bold text-sm">{profile?.name?.charAt(0) || 'G'}</span>
            )}
          </div>
          <button
            onClick={signOut}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-destructive/10 transition-colors"
            title="Logout"
          >
            <LogOut className="h-5 w-5 text-destructive" />
          </button>
        </div>
      </header>

      <div className="px-5 py-5 space-y-6">
        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">{greeting}, {firstName}</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            {dateStr} • {timeStr}
          </p>
        </div>

        {/* Add Visitor Hero Card */}
        <div
          className="rounded-2xl p-5 text-white overflow-hidden relative"
          style={{ background: 'linear-gradient(135deg, hsl(220,88%,42%) 0%, hsl(220,88%,58%) 100%)' }}
        >
          <div className="absolute right-0 top-0 h-full w-32 opacity-10">
            <svg viewBox="0 0 100 100" fill="white">
              <circle cx="80" cy="20" r="60"/>
            </svg>
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-white/20 rounded-full p-2">
              <UserPlus className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base font-bold">Add New Visitor</h2>
              <p className="text-primary-foreground/70 text-xs">Register a guest or delivery person</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/guard/add-visitor')}
            className="w-full bg-white text-primary font-bold py-2.5 rounded-xl text-sm active:scale-95 transition-all"
          >
            Register Now
          </button>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-base font-bold text-foreground mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/guard/attendance')}
              className="bg-card rounded-2xl p-4 border border-border flex flex-col items-center gap-2 active:scale-95 transition-all shadow-sm"
            >
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <UserCheck className="h-6 w-6 text-primary" />
              </div>
              <span className="text-sm font-semibold text-foreground">Attendance</span>
            </button>
            <button
              onClick={() => navigate('/guard/visitors')}
              className="bg-card rounded-2xl p-4 border border-border flex flex-col items-center gap-2 active:scale-95 transition-all shadow-sm"
            >
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <ClipboardList className="h-6 w-6 text-primary" />
              </div>
              <span className="text-sm font-semibold text-foreground">Visitor Log</span>
            </button>
            <button
              onClick={() => navigate('/mail/inbox')}
              className="col-span-2 bg-card rounded-2xl p-4 border border-border flex items-center gap-3 active:scale-95 transition-all shadow-sm"
            >
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground">MailVortx</p>
                <p className="text-xs text-muted-foreground">Open your company inbox</p>
              </div>
            </button>
          </div>
        </div>

        {/* Recent Visitors */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-foreground">Recent Visitors</h2>
            <button
              onClick={() => navigate('/guard/visitors')}
              className="text-sm font-semibold text-primary"
            >
              See All
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-card rounded-2xl p-4 border border-border h-16 animate-pulse bg-muted" />
              ))}
            </div>
          ) : visitors.length === 0 ? (
            <div className="bg-card rounded-2xl p-8 border border-border text-center">
              <Users className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No visitors today</p>
              <p className="text-xs text-muted-foreground mt-1">Tap "Register Now" to add a visitor</p>
            </div>
          ) : (
            <div className="space-y-2">
              {visitors.slice(0, 5).map(visitor => (
                <div key={visitor.id} className="bg-card rounded-2xl px-4 py-3 border border-border flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    {visitor.photo_url ? (
                      <img src={visitor.photo_url} alt={visitor.visitor_name} className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{visitor.visitor_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{visitor.company} • {visitor.purpose}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={visitor.status} />
                    <p className="text-xs text-muted-foreground">
                      {new Date(visitor.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav items={NAV_ITEMS} />
    </div>
  );
};

export default GuardDashboard;
