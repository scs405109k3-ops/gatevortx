import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Home, CalendarCheck, FileText, User, Loader2, LogIn, LogOut, Mail } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import type { Attendance } from '../../types/app';
import { useAuth } from '../../context/AuthContext';
import BottomNav from '../../components/BottomNav';
import { toast } from '../../hooks/use-toast';
import { useNotifications } from '../../hooks/useNotifications';
import NotificationsDrawer from '../../components/NotificationsDrawer';
import { checkAndNotifyOvertime } from '../../hooks/useOvertimeNotifier';

const NAV_ITEMS = [
  { label: 'Home', path: '/employee', icon: <Home className="h-5 w-5" /> },
  { label: 'Attendance', path: '/employee/attendance', icon: <CalendarCheck className="h-5 w-5" /> },
  { label: 'Leave', path: '/employee/leave', icon: <FileText className="h-5 w-5" /> },
  { label: 'Profile', path: '/employee/profile', icon: <User className="h-5 w-5" /> },
];

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI'];

const EmployeeDashboard: React.FC = () => {
  const { profile, orgType } = useAuth();
  const memberLabel = (orgType === 'school' || orgType === 'college') ? 'Student' : 'Employee';
  const navigate = useNavigate();
  const [todayRecord, setTodayRecord] = useState<Attendance | null>(null);
  const [weekRecords, setWeekRecords] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { unreadCount, notifications, markAllRead } = useNotifications();
  const today = new Date().toISOString().split('T')[0];

  const fetchData = useCallback(async () => {
    if (!profile) return;

    const { data: todayData } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', profile.id)
      .eq('date', today)
      .maybeSingle();
    setTodayRecord(todayData as Attendance | null);

    // Get this week's records (Mon–Fri)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    const { data: weekData } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', profile.id)
      .gte('date', monday.toISOString().split('T')[0])
      .order('date', { ascending: true });
    setWeekRecords((weekData as Attendance[]) || []);
  }, [profile, today]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Fetch org timings from admin
  const [orgTimings, setOrgTimings] = useState<{ start: string; end: string } | null>(null);
  useEffect(() => {
    const fetchTimings = async () => {
      if (!profile?.company_name) return;
      const { data } = await supabase
        .from('profiles')
        .select('work_start_time, work_end_time')
        .eq('role', 'admin')
        .eq('company_name', profile.company_name)
        .limit(1)
        .single();
      if (data) {
        setOrgTimings({
          start: (data as any).work_start_time?.slice(0, 5) || '09:00',
          end: (data as any).work_end_time?.slice(0, 5) || '17:00',
        });
      }
    };
    fetchTimings();
  }, [profile?.company_name]);

  const handleCheckIn = async () => {
    if (!profile) return;
    setLoading(true);
    const now = new Date();
    const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const startTime = orgTimings?.start || '09:00';
    const status = nowTime > startTime ? 'late' : 'present';

    const { error } = await supabase.from('attendance').insert({
      employee_id: profile.id,
      date: today,
      check_in: now.toISOString(),
      status,
    });

    if (error) {
      toast({ title: 'Error', description: 'Could not check in', variant: 'destructive' });
    } else {
      toast({ title: status === 'late' ? '⏰ Checked In (Late)' : '✅ Checked In!', description: `Checked in at ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}` });
      await fetchData();
    }
    setLoading(false);
  };

  const handleCheckOut = async () => {
    if (!profile || !todayRecord) return;
    setLoading(true);
    const checkOutTime = new Date().toISOString();
    const { error } = await supabase.from('attendance').update({ check_out: checkOutTime }).eq('id', todayRecord.id);
    if (error) {
      toast({ title: 'Error', description: 'Could not check out', variant: 'destructive' });
    } else {
      toast({ title: '👋 Checked Out!', description: 'See you tomorrow!' });
      // Check overtime and notify admin if > 2h
      if (todayRecord.check_in && orgTimings && profile.company_name) {
        checkAndNotifyOvertime(
          profile.id,
          profile.name || 'Employee',
          profile.company_name,
          todayRecord.check_in,
          checkOutTime,
          orgTimings.end
        );
      }
      await fetchData();
    }
    setLoading(false);
  };

  const now = new Date();
  const firstName = profile?.name?.split(' ')[0] || memberLabel;
  const isCheckedIn = !!todayRecord?.check_in;
  const isCheckedOut = !!todayRecord?.check_out;

  // Calculate hours this week
  const weekHours = weekRecords.reduce((acc, r) => {
    if (r.check_in && r.check_out) {
      const diff = (new Date(r.check_out).getTime() - new Date(r.check_in).getTime()) / 3600000;
      return acc + diff;
    }
    return acc;
  }, 0);

  // Calculate today's overtime
  const calcTodayOvertime = () => {
    if (!todayRecord?.check_in || !orgTimings) return 0;
    const endTimeToday = new Date();
    const [eh, em] = orgTimings.end.split(':').map(Number);
    endTimeToday.setHours(eh, em, 0, 0);
    const checkOut = todayRecord.check_out ? new Date(todayRecord.check_out) : new Date();
    if (checkOut > endTimeToday) {
      return (checkOut.getTime() - endTimeToday.getTime()) / 3600000;
    }
    return 0;
  };
  const todayOvertime = calcTodayOvertime();

  // Get today's day index (Mon=0)
  const todayDayIndex = now.getDay() === 0 ? 6 : now.getDay() - 1;

  const getDayStatus = (dayIdx: number) => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const targetDate = new Date(monday);
    targetDate.setDate(monday.getDate() + dayIdx);
    const dateStr = targetDate.toISOString().split('T')[0];
    const record = weekRecords.find(r => r.date === dateStr);
    if (record?.check_in) return 'present';
    if (dayIdx < todayDayIndex) return 'absent';
    if (dayIdx === todayDayIndex) return 'today';
    return 'future';
  };

  return (
    <div className="mobile-container bg-background flex flex-col pb-24 md:pb-8">
      {/* Header */}
      <header className="flex items-center bg-card px-4 py-3.5 border-b border-border">
        <div className="flex h-9 w-9 items-center justify-center bg-primary/10 rounded-lg mr-3">
          <svg className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
        </div>
        <h1 className="flex-1 text-lg font-bold text-foreground text-center">GateVortx</h1>
        <button className="flex h-9 w-9 items-center justify-center relative" onClick={() => setDrawerOpen(true)}>
          <Bell className="h-5 w-5 text-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
          )}
        </button>
      </header>

      {/* Profile Section */}
      <div className="bg-card px-5 py-4 border-b border-border">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full border-2 border-border overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-muted-foreground">{profile?.name?.charAt(0) || 'E'}</span>
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">{profile?.name || 'Employee'}</h2>
            <p className="text-sm text-muted-foreground">
              {(profile as any)?.company_name ? `${(profile as any).company_name} • ` : ''}{memberLabel}
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              {orgTimings ? `Shift: ${orgTimings.start} - ${orgTimings.end}` : (
                now.getHours() < 12 ? 'Morning' : now.getHours() < 17 ? 'Afternoon' : 'Evening'
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="px-5 py-5 space-y-5">
        {/* Current Status */}
        <div className="bg-card rounded-2xl p-4 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <div className={`h-2.5 w-2.5 rounded-full ${isCheckedIn && !isCheckedOut ? 'bg-success animate-pulse' : 'bg-muted-foreground'}`} />
            <p className="font-bold text-foreground">Current Status</p>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            {isCheckedIn && !isCheckedOut
              ? `You are currently clocked in since ${new Date(todayRecord!.check_in!).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
              : isCheckedOut
              ? `You checked out at ${new Date(todayRecord!.check_out!).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
              : 'You are currently clocked out.'}
          </p>
          {todayOvertime > 0 && (
            <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-500/10 px-3 py-1.5 rounded-full w-fit">
              ⏱️ Overtime: {todayOvertime.toFixed(1)}h
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase">{isCheckedIn && !isCheckedOut ? 'ONLINE' : 'OFFLINE'}</span>
            <div
              onClick={!loading && !isCheckedOut ? (isCheckedIn ? handleCheckOut : handleCheckIn) : undefined}
              className={`relative h-6 w-11 rounded-full transition-colors cursor-pointer ${isCheckedIn && !isCheckedOut ? 'bg-success' : 'bg-muted'}`}
            >
              <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${isCheckedIn && !isCheckedOut ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
          </div>
        </div>

        {/* Check In / Out button */}
        <button
          onClick={isCheckedIn ? handleCheckOut : handleCheckIn}
          disabled={isCheckedOut || loading}
          className={`w-full h-14 rounded-full font-bold text-lg flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-40 shadow-lg ${
            isCheckedIn && !isCheckedOut
              ? 'bg-destructive text-destructive-foreground shadow-red-200'
              : 'bg-primary text-primary-foreground shadow-primary/30'
          }`}
        >
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : isCheckedIn && !isCheckedOut ? (
            <LogOut className="h-6 w-6" />
          ) : (
            <LogIn className="h-6 w-6" />
          )}
          {loading ? 'Processing...' : isCheckedIn && !isCheckedOut ? 'CHECK OUT' : 'CHECK IN'}
        </button>

        {/* This Week */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-foreground">This Week</h2>
            <span className="text-sm font-semibold text-primary">{Math.round(weekHours)}h / 40h</span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {DAYS.map((day, idx) => {
              const status = getDayStatus(idx);
              return (
                <div
                  key={day}
                  className={`rounded-2xl p-3 flex flex-col items-center gap-2 border ${
                    status === 'today'
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-card'
                  }`}
                >
                  <span className={`text-xs font-semibold ${status === 'today' ? 'text-primary' : 'text-muted-foreground'}`}>{day}</span>
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center ${
                    status === 'present' ? 'bg-success/10' :
                    status === 'today' ? 'bg-muted' :
                    status === 'absent' ? 'bg-destructive/10' : 'bg-muted'
                  }`}>
                    {status === 'present' && (
                      <svg className="h-4 w-4 text-success" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                      </svg>
                    )}
                    {status === 'today' && (
                      <svg className="h-4 w-4 text-muted-foreground" fill="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="3"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/><circle cx="5" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>
                      </svg>
                    )}
                    {status === 'absent' && (
                      <svg className="h-3.5 w-3.5 text-destructive" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-base font-bold text-foreground mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/employee/leave')}
              className="bg-card rounded-2xl p-5 border border-border flex flex-col items-center gap-2 active:scale-95 transition-all shadow-sm"
            >
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <span className="text-sm font-semibold text-foreground">Request Leave</span>
            </button>
            <button
              onClick={() => navigate('/employee/attendance')}
              className="bg-card rounded-2xl p-5 border border-border flex flex-col items-center gap-2 active:scale-95 transition-all shadow-sm"
            >
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <CalendarCheck className="h-6 w-6 text-primary" />
              </div>
              <span className="text-sm font-semibold text-foreground">History</span>
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
      </div>

      <BottomNav items={NAV_ITEMS} />

      <NotificationsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkAllRead={markAllRead}
      />
    </div>
  );
};

export default EmployeeDashboard;
