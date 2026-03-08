import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, UserCheck, Clock, BarChart3, CalendarCheck, FileText,
  LayoutDashboard, Eye, TrendingUp, UserX, Shield, Mail,
} from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import BottomNav from '../../components/BottomNav';
import TopBar from '../../components/TopBar';
import StatusBadge from '../../components/StatusBadge';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/admin', icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: 'Visitors', path: '/admin/visitors', icon: <Users className="h-5 w-5" /> },
  { label: 'Team', path: '/admin/users', icon: <UserCheck className="h-5 w-5" /> },
  { label: 'Leaves', path: '/admin/leaves', icon: <FileText className="h-5 w-5" /> },
  { label: 'Analytics', path: '/admin/analytics', icon: <BarChart3 className="h-5 w-5" /> },
];

interface AttendanceRow {
  id: string;
  employee_id: string;
  status: 'present' | 'absent' | 'late';
  check_in?: string;
  checked_out_at?: string;
  employee_name?: string;
  guard_name?: string;
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ pendingVisitors: 0, presentToday: 0, pendingLeaves: 0, visitorsToday: 0, lateToday: 0, absentToday: 0 });
  const [attendanceRows, setAttendanceRows] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [attLoading, setAttLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];

  const fetchStats = useCallback(async () => {
    const [pv, pl, vt, attData] = await Promise.all([
      supabase.from('visitors').select('id', { count: 'exact' }).eq('status', 'pending'),
      supabase.from('leave_requests').select('id', { count: 'exact' }).eq('status', 'pending'),
      supabase.from('visitors').select('id', { count: 'exact' }).eq('date', today),
      supabase.from('attendance').select('id, status', { count: 'exact' }).eq('date', today),
    ]);

    const att = attData.data || [];
    const present = att.filter((a: any) => a.status === 'present').length;
    const late = att.filter((a: any) => a.status === 'late').length;
    const absent = att.filter((a: any) => a.status === 'absent').length;

    setStats({
      pendingVisitors: pv.count || 0,
      presentToday: present,
      pendingLeaves: pl.count || 0,
      visitorsToday: vt.count || 0,
      lateToday: late,
      absentToday: absent,
    });
    setLoading(false);
  }, [today]);

  const fetchAttendanceDetail = useCallback(async () => {
    setAttLoading(true);
    const { data: attData } = await supabase
      .from('attendance')
      .select('id, employee_id, guard_id, status, check_in, checked_out_at')
      .eq('date', today)
      .order('check_in', { ascending: false });

    if (!attData || attData.length === 0) {
      setAttendanceRows([]);
      setAttLoading(false);
      return;
    }

    // Collect all profile IDs needed (employees + guards)
    const profileIds = [...new Set([
      ...attData.map((a: any) => a.employee_id),
      ...attData.map((a: any) => a.guard_id).filter(Boolean),
    ])];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', profileIds);

    const profileMap: Record<string, string> = {};
    (profiles || []).forEach((p: any) => { profileMap[p.id] = p.name; });

    const rows: AttendanceRow[] = attData.map((a: any) => ({
      id: a.id,
      employee_id: a.employee_id,
      status: a.status,
      check_in: a.check_in,
      checked_out_at: a.checked_out_at,
      employee_name: profileMap[a.employee_id] || 'Unknown',
      guard_name: a.guard_id ? (profileMap[a.guard_id] || 'Unknown Guard') : undefined,
    }));

    setAttendanceRows(rows);
    setAttLoading(false);
  }, [today]);

  useEffect(() => {
    fetchStats();
    fetchAttendanceDetail();
  }, [fetchStats, fetchAttendanceDetail]);

  const actions = [
    { label: 'Visitor Requests', sub: `${stats.pendingVisitors} pending`, icon: Users, path: '/admin/visitors', badge: stats.pendingVisitors, color: 'bg-blue-500/10 text-blue-600' },
    { label: 'Team Members', sub: 'Manage employees & guards', icon: UserCheck, path: '/admin/users', badge: 0, color: 'bg-green-500/10 text-green-600' },
    { label: 'Leave Requests', sub: `${stats.pendingLeaves} pending`, icon: FileText, path: '/admin/leaves', badge: stats.pendingLeaves, color: 'bg-yellow-500/10 text-yellow-600' },
    { label: 'Analytics', sub: 'View reports', icon: BarChart3, path: '/admin/analytics', badge: 0, color: 'bg-purple-500/10 text-purple-600' },
    { label: 'MailVortx', sub: 'Company inbox & messaging', icon: Mail, path: '/mail/inbox', badge: 0, color: 'bg-primary/10 text-primary' },
  ];

  return (
    <div className="mobile-container bg-background flex flex-col pb-24">
      <TopBar title="Admin Dashboard" subtitle="MD / CEO" />

      <div className="px-5 py-5 space-y-5">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Visitors Today', value: stats.visitorsToday, icon: Eye },
            { label: 'Present Today', value: stats.presentToday, icon: UserCheck },
            { label: 'Late Today', value: stats.lateToday, icon: Clock },
            { label: 'Absent Today', value: stats.absentToday, icon: UserX },
            { label: 'Pending Visits', value: stats.pendingVisitors, icon: Eye },
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

        {/* Today's Attendance Summary */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Today's Attendance</h2>
            <button
              onClick={() => navigate('/admin/attendance')}
              className="text-xs font-medium text-primary"
            >
              View All
            </button>
          </div>

          {attLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted rounded-2xl animate-pulse" />)}
            </div>
          ) : attendanceRows.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-5 text-center">
              <CalendarCheck className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No attendance records yet today</p>
            </div>
          ) : (
            <div className="space-y-2">
              {attendanceRows.slice(0, 5).map(row => (
                <div key={row.id} className="bg-card rounded-2xl border border-border p-3 flex items-start gap-3 animate-fade-in">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-bold text-sm">{row.employee_name?.charAt(0) || '?'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{row.employee_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {row.check_in && (
                        <p className="text-xs text-muted-foreground">
                          In: <span className="font-medium text-foreground">
                            {new Date(row.check_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </p>
                      )}
                      {row.checked_out_at && (
                        <p className="text-xs text-muted-foreground">
                          Left: <span className="font-medium text-foreground">
                            {new Date(row.checked_out_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </p>
                      )}
                    </div>
                    {row.guard_name && (
                      <div className="flex items-center gap-1 mt-1">
                        <Shield className="h-3 w-3 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">
                          By <span className="font-medium text-foreground">{row.guard_name}</span>
                        </p>
                      </div>
                    )}
                  </div>
                  <StatusBadge status={row.status} />
                </div>
              ))}
              {attendanceRows.length > 5 && (
                <button
                  onClick={() => navigate('/admin/attendance')}
                  className="w-full py-2.5 rounded-2xl border border-dashed border-border text-xs font-medium text-muted-foreground active:scale-95 transition-all"
                >
                  +{attendanceRows.length - 5} more — View All
                </button>
              )}
            </div>
          )}
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
