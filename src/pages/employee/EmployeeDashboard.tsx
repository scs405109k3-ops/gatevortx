import React, { useEffect, useState, useCallback } from 'react';
import { Clock, CheckCircle, LogOut, CalendarCheck, User, FileText, Loader2 } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import type { Attendance } from '../../types/app';
import { useAuth } from '../../context/AuthContext';
import BottomNav from '../../components/BottomNav';
import TopBar from '../../components/TopBar';
import StatusBadge from '../../components/StatusBadge';
import { toast } from '../../hooks/use-toast';

const NAV_ITEMS = [
  { label: 'Home', path: '/employee', icon: <User className="h-5 w-5" /> },
  { label: 'Attendance', path: '/employee/attendance', icon: <CalendarCheck className="h-5 w-5" /> },
  { label: 'Leave', path: '/employee/leave', icon: <FileText className="h-5 w-5" /> },
];

const EmployeeDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [todayRecord, setTodayRecord] = useState<Attendance | null>(null);
  const [recentRecords, setRecentRecords] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  const fetchToday = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', profile.id)
      .eq('date', today)
      .maybeSingle();
    setTodayRecord(data as Attendance | null);

    const { data: recent } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', profile.id)
      .order('date', { ascending: false })
      .limit(7);
    setRecentRecords((recent as Attendance[]) || []);
  }, [profile, today]);

  useEffect(() => { fetchToday(); }, [fetchToday]);

  const handleCheckIn = async () => {
    if (!profile) return;
    setLoading(true);
    const now = new Date().toISOString();
    const checkInHour = new Date().getHours();
    const status = checkInHour > 9 ? 'late' : 'present';

    const { error } = await supabase.from('attendance').insert({
      employee_id: profile.id,
      date: today,
      check_in: now,
      status,
    });

    if (error) {
      toast({ title: 'Error', description: 'Could not check in', variant: 'destructive' });
    } else {
      toast({ title: '✅ Checked In!', description: `You checked in at ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}` });
      await fetchToday();
    }
    setLoading(false);
  };

  const handleCheckOut = async () => {
    if (!profile || !todayRecord) return;
    setLoading(true);
    const now = new Date().toISOString();

    const { error } = await supabase.from('attendance').update({ check_out: now }).eq('id', todayRecord.id);
    if (error) {
      toast({ title: 'Error', description: 'Could not check out', variant: 'destructive' });
    } else {
      toast({ title: '👋 Checked Out!', description: `See you tomorrow!` });
      await fetchToday();
    }
    setLoading(false);
  };

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="mobile-container bg-background flex flex-col pb-24">
      <TopBar title="My Workspace" subtitle="Employee" />

      <div className="px-5 py-5 space-y-5">
        {/* Clock Card */}
        <div
          className="rounded-2xl p-5 text-white text-center"
          style={{ background: 'linear-gradient(135deg, hsl(213,57%,25%) 0%, hsl(217,91%,43%) 100%)' }}
        >
          <p className="text-4xl font-bold tracking-tight">{timeStr}</p>
          <p className="text-blue-200 text-sm mt-1">{dateStr}</p>
          {todayRecord && (
            <div className="flex items-center justify-center gap-4 mt-3">
              {todayRecord.check_in && (
                <div className="bg-white/20 rounded-xl px-3 py-1">
                  <p className="text-xs text-blue-100">In</p>
                  <p className="text-sm font-semibold">
                    {new Date(todayRecord.check_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              )}
              {todayRecord.check_out && (
                <div className="bg-white/20 rounded-xl px-3 py-1">
                  <p className="text-xs text-blue-100">Out</p>
                  <p className="text-sm font-semibold">
                    {new Date(todayRecord.check_out).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Check In / Out Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleCheckIn}
            disabled={!!todayRecord?.check_in || loading}
            className="h-16 rounded-2xl bg-success text-success-foreground font-semibold flex flex-col items-center justify-center gap-1 disabled:opacity-40 active:scale-95 transition-all"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-6 w-6" />}
            <span className="text-sm">Check In</span>
          </button>
          <button
            onClick={handleCheckOut}
            disabled={!todayRecord?.check_in || !!todayRecord?.check_out || loading}
            className="h-16 rounded-2xl bg-primary text-primary-foreground font-semibold flex flex-col items-center justify-center gap-1 disabled:opacity-40 active:scale-95 transition-all"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogOut className="h-6 w-6" />}
            <span className="text-sm">Check Out</span>
          </button>
        </div>

        {/* Today Status */}
        {todayRecord && (
          <div className="bg-card rounded-2xl p-4 border border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Today's Status</p>
                <p className="text-xs text-muted-foreground">{dateStr}</p>
              </div>
            </div>
            <StatusBadge status={todayRecord.status} />
          </div>
        )}

        {/* Recent Attendance */}
        {recentRecords.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-3">Recent Attendance</h2>
            <div className="space-y-2">
              {recentRecords.map(record => (
                <div key={record.id} className="bg-card rounded-xl p-3 border border-border flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {new Date(record.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                    <div className="flex gap-3">
                      {record.check_in && (
                        <p className="text-xs text-muted-foreground">
                          In: {new Date(record.check_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                      {record.check_out && (
                        <p className="text-xs text-muted-foreground">
                          Out: {new Date(record.check_out).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={record.status} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <BottomNav items={NAV_ITEMS} />
    </div>
  );
};

export default EmployeeDashboard;
