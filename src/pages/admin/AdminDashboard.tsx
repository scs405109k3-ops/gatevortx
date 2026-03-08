import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, UserCheck, Clock, BarChart3, CalendarCheck, FileText,
  LayoutDashboard, Eye, TrendingUp,
} from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import BottomNav from '../../components/BottomNav';
import TopBar from '../../components/TopBar';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/admin', icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: 'Visitors', path: '/admin/visitors', icon: <Users className="h-5 w-5" /> },
  { label: 'Team', path: '/admin/users', icon: <UserCheck className="h-5 w-5" /> },
  { label: 'Leaves', path: '/admin/leaves', icon: <FileText className="h-5 w-5" /> },
  { label: 'Analytics', path: '/admin/analytics', icon: <BarChart3 className="h-5 w-5" /> },
];

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ pendingVisitors: 0, presentToday: 0, pendingLeaves: 0, visitorsToday: 0 });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    const [pv, pt, pl, vt] = await Promise.all([
      supabase.from('visitors').select('id', { count: 'exact' }).eq('status', 'pending'),
      supabase.from('attendance').select('id', { count: 'exact' }).eq('date', today).eq('status', 'present'),
      supabase.from('leave_requests').select('id', { count: 'exact' }).eq('status', 'pending'),
      supabase.from('visitors').select('id', { count: 'exact' }).eq('date', today),
    ]);
    setStats({
      pendingVisitors: pv.count || 0,
      presentToday: pt.count || 0,
      pendingLeaves: pl.count || 0,
      visitorsToday: vt.count || 0,
    });
    setLoading(false);
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const actions = [
    { label: 'Visitor Requests', sub: `${stats.pendingVisitors} pending`, icon: Users, path: '/admin/visitors', badge: stats.pendingVisitors, color: 'bg-blue-500/10 text-blue-600' },
    { label: 'Team Members', sub: 'Manage employees & guards', icon: UserCheck, path: '/admin/users', badge: 0, color: 'bg-green-500/10 text-green-600' },
    { label: 'Leave Requests', sub: `${stats.pendingLeaves} pending`, icon: FileText, path: '/admin/leaves', badge: stats.pendingLeaves, color: 'bg-yellow-500/10 text-yellow-600' },
    { label: 'Analytics', sub: 'View reports', icon: BarChart3, path: '/admin/analytics', badge: 0, color: 'bg-purple-500/10 text-purple-600' },
  ];

  return (
    <div className="mobile-container bg-background flex flex-col pb-24">
      <TopBar title="Admin Dashboard" subtitle="MD / CEO" />

      <div className="px-5 py-5 space-y-5">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Visitors Today', value: stats.visitorsToday, icon: Eye },
            { label: 'Present Today', value: stats.presentToday, icon: TrendingUp },
            { label: 'Pending Visits', value: stats.pendingVisitors, icon: Clock },
            { label: 'Pending Leaves', value: stats.pendingLeaves, icon: FileText },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-card rounded-2xl p-4 border border-border shadow-sm">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                {loading ? (
                  <div className="h-7 w-10 bg-muted rounded animate-pulse mb-1" />
                ) : (
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                )}
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Quick Actions</h2>
          <div className="space-y-3">
            {actions.map(action => {
              const Icon = action.icon;
              return (
                <button
                  key={action.path}
                  onClick={() => navigate(action.path)}
                  className="w-full bg-card rounded-2xl p-4 border border-border shadow-sm flex items-center gap-4 active:scale-[0.98] transition-all text-left"
                >
                  <div className={`h-12 w-12 rounded-xl ${action.color} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground text-sm">{action.label}</p>
                    <p className="text-xs text-muted-foreground">{action.sub}</p>
                  </div>
                  {action.badge > 0 && (
                    <span className="h-6 min-w-[24px] bg-primary text-primary-foreground rounded-full text-xs font-bold flex items-center justify-center px-1">
                      {action.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <BottomNav items={NAV_ITEMS} />
    </div>
  );
};

export default AdminDashboard;
